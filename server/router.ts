import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from './config.ts';
import type { Database } from './persistence/client.ts';
import { apiError } from '../src/lib/api.ts';
import {
  validateCreateItemBody,
  validateUpdateItemBody,
} from '../src/lib/items.ts';
import { validateCreateRelationBody } from '../src/lib/relations.ts';
import {
  validateAddContextMemberBody,
  validateCreateContextBody,
  validateUpdateContextBody,
} from '../src/lib/contexts.ts';
import { sendJson } from './http.ts';
import { metrics, renderMetrics } from './metrics.ts';
import { sql } from 'drizzle-orm';
import { RateLimiter, rateRuleFor } from './ratelimit.ts';
import { newRequestId } from './idempotency.ts';
import { logRequest } from './log.ts';
import { chatComplete } from './agent/llm.ts';
import { clearLocalUserId, llmPublicConfig, readLocalUserId, resolveLlmConfig, writeLlmApiKey, writeLlmSettings, writeLocalUserId } from './storage/settings.ts';
import { isProviderId, detectProvider, USD_PER_MILLION } from '../src/lib/providers.ts';
import { buildOpenApi } from './openapi.ts';
import { createNewsItem, deleteNewsItem, readNews, updateNewsItem } from './storage/news.ts';
import { createItem, deleteItem, getItem, listDeletedItems, listItemsPaged, purgeItem, restoreItem, updateItem } from './repo/items.ts';
import { searchAll } from './repo/search.ts';
import { createRelation, listRelations, listRelationsForItems } from './repo/relations.ts';
import { listEvents, listEventsForItems, appendEvent, activityCountsByItem } from './repo/events.ts';
import { getSpatialLayout, putSpatialLayout } from './repo/spatial.ts';
import {
  listSchedules, createSchedule, updateSchedule, deleteSchedule,
} from './repo/schedules.ts';
import { runScheduleNow } from './intel/scheduler.ts';
import { validateCreateScheduleBody, validateUpdateScheduleBody } from '../src/lib/schedules.ts';
import { computeAttribution } from '../src/lib/events.ts';
import {
  addContextMember,
  contextOwner,
  createContext,
  deleteContext,
  getContext,
  listContexts,
  removeContextMember,
  updateContext,
} from './repo/contexts.ts';
import {
  addClusterMember,
  createCluster,
  deleteCluster,
  getCluster,
  listClusters,
  removeClusterMember,
  updateCluster,
} from './repo/clusters.ts';
import { createProposal, listProposals, resolveProposalApplying } from './repo/proposals.ts';
import {
  createTagDefinition,
  createTagValue,
  deleteTagValue,
  listTagDefinitions,
  listTagValues,
  setTagValueConfirmed,
  listMetaGroups,
  listTagGroupIds,
  setItemParams,
  filterItemIds,
} from './repo/tags.ts';
import {
  PROFILE_DEFINITION_ID,
  validateCreateTagDefinitionBody,
  validateCreateTagValueBody,
} from '../src/lib/tags.ts';
import {
  validateAddClusterMemberBody,
  validateCreateClusterBody,
  validateUpdateClusterBody,
} from '../src/lib/clusters.ts';
import {
  validateCreateProposalBody,
  validateResolveProposalBody,
} from '../src/lib/proposals.ts';
import {
  createSource,
  deleteSource,
  getSource,
  listSources,
  markSync,
  sourceOwner,
  updateSource,
} from './repo/sources.ts';
import {
  validateCreateSourceBody,
  validateUpdateSourceBody,
} from '../src/lib/sources.ts';
import { runGithubSync } from './sync/github.ts';
import { runSourceSync, processCaptureTask, processSnapshot } from './intel/pipeline.ts';
import { upsertSnapshot } from './repo/snapshots.ts';
import { contentHash } from './intel/extract.ts';
import { proposeBlockAssignment } from './agent/organizer.ts';
import { validateIngestBatchBody } from '../src/lib/ingest.ts';
import type { IngestBatchBody } from '../src/lib/ingest.ts';
import type { FetchedDoc } from './intel/adapters/types.ts';
import { createTask, getTask, listTasks, updateTask } from './repo/tasks.ts';
import { suggestForChunks } from './agent/proposer.ts';
import { runDetection } from './agent/detector.ts';
import { readSecret, writeSecret } from './storage/secrets.ts';
import { DEFAULT_USER_ID, verifyApiToken, listTokens, createApiToken, revokeApiToken } from './storage/tokens.ts';
import {
  createUser,
  deleteUser,
  getUser,
  listShares,
  listUsers,
  revokeShare,
  shareCluster,
} from './repo/users.ts';
import { dirname } from 'node:path';
import { fetchUrlText, SsrfError } from './ingest/html.ts';
import { storeTextFile } from './storage/local.ts';
import { createAuthz } from './authz.ts';
import type { RouteCtx, RouteResult, RouteSpec } from './pipeline.ts';
import { dispatch, fail, knownRoutes, ok } from './pipeline.ts';
import { MCP_SERVER_INFO, MCP_TOOLS } from './mcp/tools.ts';

const rateLimiter = new RateLimiter(); // O1-5: single-process bucket store

function safeHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return '';
  }
}

/* V1 engagement traces: throttle duplicate 'opened' events per viewer+item (10 min). */
const openThrottle = new Map<string, number>();

/**
 * Low-cardinality route label for metrics: collapse id-shaped segments so
 * `/api/items/raw_abc123` and `/api/items/raw_def456` share one series.
 */
function metricRoute(path: string): string {
  return path
    .split('/')
    .map((seg) => (/^[a-z]{2,5}_[0-9a-z-]{6,}$/i.test(seg) || /^[0-9a-f-]{16,}$/i.test(seg) ? ':id' : seg))
    .join('/');
}

/* ------------------------------------------------------------------ *
 * Handlers (B1): pure route logic, everything per-request comes from
 * RouteCtx; shared guard idioms live in authz.ts / pipeline.ts.
 * Policy (D-092): invisible → 404 (hide existence); visible but not
 * permitted → 403.
 * ------------------------------------------------------------------ */

function contextHidden(ctx: RouteCtx, id: string): Promise<RouteResult | null> | RouteResult | null {
  if (ctx.authz.unrestricted) return null;
  return contextOwner(ctx.db, id).then((owner) =>
    owner === ctx.viewerId ? null : fail('not_found', 'Context not found'),
  );
}

function sourceHidden(ctx: RouteCtx, id: string): Promise<RouteResult | null> {
  if (ctx.authz.unrestricted) return Promise.resolve(null);
  return sourceOwner(ctx.db, id).then((owner) =>
    owner === ctx.viewerId ? null : fail('not_found', 'Source not found'),
  );
}

async function clusterOwnerOnly(ctx: RouteCtx, id: string, message: string): Promise<RouteResult | null> {
  const role = await ctx.authz.clusterRole(id);
  if (!role) return fail('not_found', 'Cluster not found');
  if (role !== 'owner') return fail('forbidden', message);
  return null;
}

async function hTrashGet(ctx: RouteCtx): Promise<RouteResult> {
  return ok({ ok: true, items: await listDeletedItems(ctx.db) });
}

/* M-2: MCP onboarding metadata — the Settings page renders the tool list and
   connect command from here (never hardcoded in the UI). Read-only, no secrets. */
function hMetaMcpGet(): RouteResult {
  return ok({
    ok: true,
    server: MCP_SERVER_INFO,
    command: 'npm run mcp',
    env: [
      { name: 'GSC_API_URL', required: true, example: 'http://127.0.0.1:8788' },
      { name: 'GSC_API_TOKEN', required: true, example: '<PAT — scope read for tools, rw for gsc_propose>' },
    ],
    tools: MCP_TOOLS,
  });
}

async function hItemRestore(ctx: RouteCtx): Promise<RouteResult> {
  const { db, authz, params } = ctx;
  const deny = await authz.itemWriteDenied(params[0]);
  if (deny === 'hidden') return fail('not_found', 'Item not found');
  const restored = await restoreItem(db, params[0]);
  if (!restored) return fail('not_found', 'Item not found');
  return ok({ ok: true, restored: true });
}

async function hItemPurge(ctx: RouteCtx): Promise<RouteResult> {
  const { db, authz, params } = ctx;
  const deny = await authz.itemWriteDenied(params[0]);
  if (deny === 'hidden') return fail('not_found', 'Item not found');
  const purged = await purgeItem(db, params[0]);
  if (!purged) return fail('not_found', 'Item not found');
  return ok({ ok: true, purged: true });
}

async function hSearchGet(ctx: RouteCtx): Promise<RouteResult> {
  const { db, url, authz } = ctx;
  const q = url.searchParams.get('q') ?? '';
  const hits = await searchAll(db, q);
  const allowed = await authz.visibleItemIds();
  return ok({ ok: true, hits: allowed ? hits.filter((h) => h.group !== 'items' && h.group !== 'objects' ? true : allowed.has(h.id)) : hits });
}

async function hItemsList(ctx: RouteCtx): Promise<RouteResult> {
  const { db, url, authz } = ctx;
  const filters = {
    type: url.searchParams.get('type') ?? undefined,
    domain: url.searchParams.get('domain') ?? undefined,
    q: url.searchParams.get('q') ?? undefined,
  };
  /* META_TAG_V1 筛选: ?group=&tag=&param.<key>=<value> → id set intersection. */
  const groupId = url.searchParams.get('group') ?? undefined;
  const tagId = url.searchParams.get('tag') ?? undefined;
  const metaParams: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (k.startsWith('param.')) metaParams[k.slice(6)] = v;
  }
  const metaFilterIds = (groupId || tagId || Object.keys(metaParams).length > 0)
    ? await filterItemIds(db, { groupId, tagId, params: metaParams })
    : undefined;
  /* T202: cursor pagination — cursor/limit present or always (default 50).
     B2/F8: viewer scope is applied in the query so total/cursor are honest. */
  const page = await listItemsPaged(db, {
    ...filters,
    ids: metaFilterIds,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
  }, { visibleIds: await authz.visibleItemIds() });
  /* V1 engagement traces: per-item user/agent counts (batched, no N+1). */
  const activity = await activityCountsByItem(db, page.items.map((i) => i.id));
  return ok({
    ok: true,
    items: page.items,
    next_cursor: page.next_cursor,
    total: page.total,
    activity: Object.fromEntries(activity),
  });
}

async function hItemsCreate(ctx: RouteCtx): Promise<RouteResult> {
  const { db, config, body, viewerId } = ctx;
  const item = await createItem(db, body as Parameters<typeof createItem>[1], async (id, fields) => {
    if ((body as { type: string }).type !== 'raw.filecontent') return fields;
    const stored = await storeTextFile(
      config,
      id,
      fields.filename ?? 'import.txt',
      fields.content_text ?? '',
    );
    return { ...fields, ...stored };
  }, viewerId);
  return ok({ ok: true, item }, 201);
}

async function hItemGet(ctx: RouteCtx): Promise<RouteResult> {
  const { db, authz, params, viewerId } = ctx;
  const item = await getItem(db, params[0]);
  if (!item || !(await authz.canViewItem(item.id))) {
    return fail('not_found', 'Item not found');
  }
  const [relations, history] = await Promise.all([
    listRelations(db, item.id),
    listEvents(db, item.id),
  ]);
  /* V1: 'opened' trace is now explicit (U1) — only `?trace=1` (the UI detail
     view) records it. Plain reads (export, indexing) stay side-effect-free. */
  if (ctx.url.searchParams.get('trace') === '1') {
    const throttleKey = `${viewerId}:${item.id}`;
    const lastOpen = openThrottle.get(throttleKey) ?? 0;
    if (Date.now() - lastOpen > 10 * 60_000) {
      openThrottle.set(throttleKey, Date.now());
      await appendEvent(db, { item_id: item.id, actor: 'user', action: 'opened', detail: '' });
    }
  }
  return ok({ ok: true, item, relations, events: history, attribution: computeAttribution(history) });
}

async function hItemPatch(ctx: RouteCtx): Promise<RouteResult> {
  const { db, authz, params, body } = ctx;
  const deny = await authz.itemWriteDenied(params[0]);
  if (deny === 'hidden') return fail('not_found', 'Item not found');
  if (deny === 'forbidden') return fail('forbidden', 'Only the owner can edit this item');
  const item = await updateItem(db, params[0], body as Parameters<typeof updateItem>[2]);
  if (!item) return fail('not_found', 'Item not found');
  return ok({ ok: true, item });
}

async function hItemDelete(ctx: RouteCtx): Promise<RouteResult> {
  const { db, authz, params } = ctx;
  const deny = await authz.itemWriteDenied(params[0]);
  if (deny === 'hidden') return fail('not_found', 'Item not found');
  if (deny === 'forbidden') return fail('forbidden', 'Only the owner can delete this item');
  const removed = await deleteItem(db, params[0]);
  if (!removed) return fail('not_found', 'Item not found');
  return ok({ ok: true, deleted: true });
}

async function hEventsGet(ctx: RouteCtx): Promise<RouteResult> {
  /* V2 (M2) timeline projection: batched read-only event stream. */
  const { db, url, authz } = ctx;
  const ids = (url.searchParams.get('item_ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
  if (ids.length === 0) return fail('contract', 'item_ids required');
  const allowed = await authz.visibleItemIds();
  const scoped = allowed ? ids.filter((id) => allowed.has(id)) : ids;
  const stream = await listEventsForItems(db, scoped, {
    since: url.searchParams.get('since') ?? undefined,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
  });
  return ok({ ok: true, events: stream });
}

async function hSpatialGet(ctx: RouteCtx): Promise<RouteResult> {
  /* V4 (M4) kept-tier spatial layout read (owner + page scoped). */
  const { db, url, viewerId } = ctx;
  const page = url.searchParams.get('page') ?? '';
  if (!page || page.length > 40) return fail('contract', 'page required');
  return ok({ ok: true, positions: await getSpatialLayout(db, viewerId, page) });
}

async function hSpatialPut(ctx: RouteCtx): Promise<RouteResult> {
  /* V4 (M4) kept-tier spatial layout write — per-row coordinates, no item mutation. */
  const { db, url, body, viewerId } = ctx;
  const page = url.searchParams.get('page') ?? '';
  const entries = (body as Record<string, unknown>)?.items;
  if (!page || page.length > 40 || !Array.isArray(entries) || entries.length > 500
    || entries.some((e) => typeof (e as Record<string, unknown>)?.item_id !== 'string'
      || typeof (e as Record<string, unknown>)?.x !== 'number'
      || typeof (e as Record<string, unknown>)?.y !== 'number')) {
    return fail('contract', 'Invalid spatial layout body');
  }
  const saved = await putSpatialLayout(
    db,
    viewerId,
    page,
    entries as { item_id: string; x: number; y: number }[],
    Boolean((body as Record<string, unknown>).replace),
  );
  return ok({ ok: true, saved });
}

async function hSchedulesList(ctx: RouteCtx): Promise<RouteResult> {
  /* LOCAL_SIM: scheduler registry read. */
  return ok({ ok: true, schedules: await listSchedules(ctx.db) });
}

async function hSchedulesCreate(ctx: RouteCtx): Promise<RouteResult> {
  const { db, body, viewerId } = ctx;
  return ok({ ok: true, schedule: await createSchedule(db, body as Parameters<typeof createSchedule>[1], viewerId) }, 201);
}

async function hSchedulePatch(ctx: RouteCtx): Promise<RouteResult> {
  const { db, body, params } = ctx;
  const updated = await updateSchedule(db, params[0], body as Parameters<typeof updateSchedule>[2]);
  return updated ? ok({ ok: true, schedule: updated }) : fail('not_found', 'Schedule not found');
}

async function hScheduleDelete(ctx: RouteCtx): Promise<RouteResult> {
  const removed = await deleteSchedule(ctx.db, ctx.params[0]);
  return removed ? ok({ ok: true, deleted: true }) : fail('not_found', 'Schedule not found');
}

async function hScheduleRun(ctx: RouteCtx): Promise<RouteResult> {
  /* Console "run now": inline execution guarded by the running lock. */
  const { db, config, params } = ctx;
  const result = await runScheduleNow(db, config, params[0]);
  return result.ok ? ok({ ok: true, detail: result.detail }) : fail('contract', result.detail);
}

async function hIngestBatch(ctx: RouteCtx): Promise<RouteResult> {
  /* G2 batch intake: group (client×project) → source anchor, docs through the
     Light Up pipeline (snapshot-idempotent), then a best-effort block-assignment
     pass that only ever creates `cluster` proposals (D-042). */
  const { db, config, body, viewerId } = ctx;
  const batch = body as IngestBatchBody;
  const label = `agent:${batch.group.client}:${batch.group.project}`;
  const existing = await listSources(db, viewerId);
  let source = existing.find((s) => s.kind === 'agent' && s.label === label);
  if (!source) {
    source = await createSource(db, {
      kind: 'agent',
      label,
      scope: `client=${batch.group.client};project=${batch.group.project}`,
    }, viewerId);
  }
  let imported = 0;
  let skipped = 0;
  const newItems: { id: string; title: string; content: string }[] = [];
  for (const [i, doc] of batch.docs.entries()) {
    const rawHash = contentHash(doc.content_text);
    const fetched: FetchedDoc = {
      externalId: `agent:${batch.group.client}:${batch.group.project}:${batch.group.session_id}:${i}`,
      url: doc.url ?? `agent://${batch.group.client}/${batch.group.project}/${batch.group.session_id}`,
      title: doc.title || `session ${batch.group.session_id}`,
      contentText: doc.content_text,
      author: doc.author ?? batch.group.client,
      publishedAt: doc.captured_at,
      rawHash,
      metadata: {
        client: batch.group.client,
        project: batch.group.project,
        session_id: batch.group.session_id,
        captured_at: doc.captured_at ?? new Date().toISOString(),
      },
    };
    const snap = await upsertSnapshot(db, source.id, fetched);
    if (!snap.created) {
      skipped += 1;
      continue;
    }
    const result = await processSnapshot(db, config, fetched, { kind: 'agent', ownerId: viewerId });
    newItems.push({ id: result.itemId, title: fetched.title, content: doc.content_text });
    imported += 1;
  }

  // Block assignment (best-effort): cluster proposals only — never a direct write.
  let blockProposals = 0;
  if (newItems.length > 0) {
    try {
      const known = (await listClusters(db)).map((c) => c.title);
      const assignments = await proposeBlockAssignment(config, newItems, known);
      for (const a of assignments) {
        await createProposal(db, {
          kind: 'cluster',
          target_id: a.item_id,
          proposed_value: a.cluster_name,
          rationale: a.rationale || `block assignment (${batch.group.client})`,
          source: 'agent',
        });
        blockProposals += 1;
      }
    } catch (e) {
      console.error('[ingest] block assignment skipped:', e instanceof Error ? e.message : e);
    }
  }
  return ok({
    ok: true,
    source_id: source.id,
    imported,
    skipped,
    block_proposals: blockProposals,
  }, 201);
}

async function hRelationsGet(ctx: RouteCtx): Promise<RouteResult> {
  /* V2 (M2) relations projection: batched read-only edge listing. */
  const { db, url, authz } = ctx;
  const ids = (url.searchParams.get('item_ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
  if (ids.length === 0) return fail('contract', 'item_ids required');
  const allowed = await authz.visibleItemIds();
  const scoped = allowed ? ids.filter((id) => allowed.has(id)) : ids;
  const edges = await listRelationsForItems(db, scoped);
  const out = allowed ? edges.filter((r) => allowed.has(r.from_id) && allowed.has(r.to_id)) : edges;
  return ok({ ok: true, relations: out });
}

async function hRelationsCreate(ctx: RouteCtx): Promise<RouteResult> {
  const created = await createRelation(ctx.db, ctx.body as Parameters<typeof createRelation>[1]);
  if (!created.ok) {
    return ok(apiError(created.reason, created.message), created.reason === 'not_found' ? 404 : 409);
  }
  return ok({ ok: true, relation: created.relation }, 201);
}

async function hContextsList(ctx: RouteCtx): Promise<RouteResult> {
  // B2: owner-scoped list (contexts have no share mechanism).
  const { db, authz } = ctx;
  return ok({ ok: true, contexts: await listContexts(db, authz.unrestricted ? undefined : ctx.viewerId) });
}

async function hContextsCreate(ctx: RouteCtx): Promise<RouteResult> {
  const { db, body, viewerId } = ctx;
  return ok({ ok: true, context: await createContext(db, body as Parameters<typeof createContext>[1], viewerId) }, 201);
}

async function hContextGet(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params } = ctx;
  const hidden = await contextHidden(ctx, params[0]);
  if (hidden) return hidden;
  const context = await getContext(db, params[0]);
  if (!context) return fail('not_found', 'Context not found');
  return ok({ ok: true, context });
}

async function hContextPatch(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params, body } = ctx;
  const hidden = await contextHidden(ctx, params[0]);
  if (hidden) return hidden;
  const context = await updateContext(db, params[0], body as Parameters<typeof updateContext>[2]);
  if (!context) return fail('not_found', 'Context not found');
  return ok({ ok: true, context });
}

async function hContextDelete(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params } = ctx;
  const hidden = await contextHidden(ctx, params[0]);
  if (hidden) return hidden;
  const removed = await deleteContext(db, params[0]);
  if (!removed) return fail('not_found', 'Context not found');
  return ok({ ok: true, deleted: true });
}

async function hContextMemberAdd(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params, body } = ctx;
  const hidden = await contextHidden(ctx, params[0]);
  if (hidden) return hidden;
  const result = await addContextMember(db, params[0], (body as { item_id: string }).item_id);
  if (!result.ok) return fail(result.reason, result.message);
  return ok({ ok: true, context: result.context }, 201);
}

async function hContextMemberRemove(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params, body } = ctx;
  const hidden = await contextHidden(ctx, params[0]);
  if (hidden) return hidden;
  const result = await removeContextMember(db, params[0], (body as { item_id: string }).item_id);
  if (!result.ok) return fail(result.reason, result.message);
  return ok({ ok: true, context: result.context });
}

async function hClustersList(ctx: RouteCtx): Promise<RouteResult> {
  // B2: scoped list — owner OR shared to the viewer.
  const { db, authz } = ctx;
  return ok({ ok: true, clusters: await listClusters(db, authz.unrestricted ? undefined : ctx.viewerId) });
}

async function hClustersCreate(ctx: RouteCtx): Promise<RouteResult> {
  const { db, body, viewerId } = ctx;
  return ok({ ok: true, cluster: await createCluster(db, body as Parameters<typeof createCluster>[1], viewerId) }, 201);
}

async function hClusterGet(ctx: RouteCtx): Promise<RouteResult> {
  const { db, authz, params } = ctx;
  const role = await authz.clusterRole(params[0]);
  if (!role) return fail('not_found', 'Cluster not found');
  const cluster = await getCluster(db, params[0]);
  if (!cluster) return fail('not_found', 'Cluster not found');
  return ok({ ok: true, cluster });
}

async function hClusterPatch(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params, body } = ctx;
  const denied = await clusterOwnerOnly(ctx, params[0], 'Only the owner can edit a cluster');
  if (denied) return denied;
  const cluster = await updateCluster(db, params[0], body as Parameters<typeof updateCluster>[2]);
  if (!cluster) return fail('not_found', 'Cluster not found');
  return ok({ ok: true, cluster });
}

async function hClusterDelete(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params } = ctx;
  const denied = await clusterOwnerOnly(ctx, params[0], 'Only the owner can delete a cluster');
  if (denied) return denied;
  const removed = await deleteCluster(db, params[0]);
  if (!removed) return fail('not_found', 'Cluster not found');
  return ok({ ok: true, deleted: true });
}

async function hClusterSharesList(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params } = ctx;
  const denied = await clusterOwnerOnly(ctx, params[0], 'Only the owner can view shares');
  if (denied) return denied;
  return ok({ ok: true, shares: await listShares(db, params[0]) });
}

async function hClusterShareCreate(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params } = ctx;
  const denied = await clusterOwnerOnly(ctx, params[0], 'Only the owner can manage shares');
  if (denied) return denied;
  const b = (ctx.body ?? {}) as Record<string, unknown>;
  const shareRole = b.role === 'add' ? 'add' : 'view';
  let userId = typeof b.user_id === 'string' ? b.user_id : '';
  if (!userId && typeof b.name === 'string') {
    const found = (await listUsers(db)).find((u) => u.name === b.name);
    if (!found) return fail('not_found', 'User not found');
    userId = found.id;
  }
  if (!userId || !(await getUser(db, userId))) return fail('contract', 'Invalid user');
  const result = await shareCluster(db, params[0], userId, shareRole);
  if (!result.ok) return fail(result.reason, result.message);
  return ok({ ok: true, shares: await listShares(db, params[0]) }, 201);
}

async function hClusterShareRevoke(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params } = ctx;
  const denied = await clusterOwnerOnly(ctx, params[0], 'Only the owner can manage shares');
  if (denied) return denied;
  const revoked = await revokeShare(db, params[0], params[1]);
  if (!revoked) return fail('not_found', 'Share not found');
  return ok({ ok: true, deleted: true });
}

async function hClusterMemberAdd(ctx: RouteCtx): Promise<RouteResult> {
  const { db, authz, params, body } = ctx;
  const role = await authz.clusterRole(params[0]);
  if (!role) return fail('not_found', 'Cluster not found');
  if (role !== 'owner' && role !== 'add') return fail('forbidden', 'View-only share cannot add members');
  const result = await addClusterMember(db, params[0], (body as { item_id: string }).item_id);
  if (!result.ok) return fail(result.reason, result.message);
  return ok({ ok: true, cluster: await getCluster(db, params[0]) }, 201);
}

async function hClusterMemberRemove(ctx: RouteCtx): Promise<RouteResult> {
  const { db, authz, params, body } = ctx;
  const role = await authz.clusterRole(params[0]);
  if (!role) return fail('not_found', 'Cluster not found');
  if (role !== 'owner') return fail('forbidden', 'Only the owner can remove members');
  const result = await removeClusterMember(db, params[0], (body as { item_id: string }).item_id);
  if (!result.ok) return fail(result.reason, result.message);
  return ok({ ok: true, cluster: await getCluster(db, params[0]) });
}

async function hSourcesList(ctx: RouteCtx): Promise<RouteResult> {
  // B2: owner-scoped list (sources have no share mechanism).
  const { db, authz } = ctx;
  return ok({ ok: true, sources: await listSources(db, authz.unrestricted ? undefined : ctx.viewerId) });
}

async function hSourcesCreate(ctx: RouteCtx): Promise<RouteResult> {
  const { db, secretsDir, body, viewerId } = ctx;
  const source = await createSource(db, body as Parameters<typeof createSource>[1], viewerId);
  const token = (body as { token?: string }).token;
  if (token) writeSecret(secretsDir, source.id, token);
  return ok({ ok: true, source }, 201);
}

async function hSourcePatch(ctx: RouteCtx): Promise<RouteResult> {
  const { db, secretsDir, params, body } = ctx;
  const hidden = await sourceHidden(ctx, params[0]);
  if (hidden) return hidden;
  const source = await updateSource(db, params[0], body as Parameters<typeof updateSource>[2]);
  if (!source) return fail('not_found', 'Source not found');
  const token = (body as { token?: string }).token;
  if (typeof token === 'string') writeSecret(secretsDir, source.id, token);
  return ok({ ok: true, source });
}

async function hSourceDelete(ctx: RouteCtx): Promise<RouteResult> {
  const { db, secretsDir, params } = ctx;
  const hidden = await sourceHidden(ctx, params[0]);
  if (hidden) return hidden;
  const removed = await deleteSource(db, params[0]);
  if (!removed) return fail('not_found', 'Source not found');
  writeSecret(secretsDir, params[0], '');
  return ok({ ok: true, deleted: true });
}

async function hSourceSync(ctx: RouteCtx): Promise<RouteResult> {
  const { db, config, secretsDir, params } = ctx;
  const hidden = await sourceHidden(ctx, params[0]);
  if (hidden) return hidden;
  const source = await getSource(db, params[0]);
  if (!source) return fail('not_found', 'Source not found');
  if (source.status === 'paused') return fail('conflict', 'Source is paused');
  try {
    const token = readSecret(secretsDir, source.id);
    const result = source.kind === 'github'
      ? await runGithubSync(db, source, token)
      : await runSourceSync(db, config, source, token);
    await markSync(db, source.id, { ok: true });
    return ok({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    await markSync(db, source.id, { ok: false, message });
    return fail('internal', message);
  }
}

async function hIngestUrl(ctx: RouteCtx): Promise<RouteResult> {
  const { config, body } = ctx;
  const rawUrl = (body as Record<string, unknown>)?.url;
  if (typeof rawUrl !== 'string' || !/^https?:\/\//i.test(rawUrl)) {
    return fail('contract', 'Invalid url');
  }
  try {
    const result = await fetchUrlText(rawUrl, { allowPrivate: config.allowPrivateIngest });
    return ok({ ok: true, ...result });
  } catch (e) {
    if (e instanceof SsrfError) return fail('contract', e.message);
    return fail('internal', e instanceof Error ? e.message : 'Fetch failed');
  }
}

async function hCaptureList(ctx: RouteCtx): Promise<RouteResult> {
  const rows = await listTasks(ctx.db, 50);
  return ok({
    ok: true,
    tasks: rows.map((r) => ({
      id: r.id,
      url: r.url,
      kind: r.kind,
      status: r.status,
      stage: r.stage,
      retry_count: r.retry_count,
      last_error: r.last_error,
      created_at: r.created_at.toISOString(),
      completed_at: r.completed_at ? r.completed_at.toISOString() : null,
    })),
  });
}

async function hCaptureCreate(ctx: RouteCtx): Promise<RouteResult> {
  // Web Intelligence MVP: explicit URL capture → task → extract → Light Up.
  // Smallest reliable implementation: run the task inline through the real
  // lifecycle (create → processing → completed/failed). A separate async worker
  // can later drain the queue via claimNextTask; processCaptureTask is idempotent.
  const { db, config, body, viewerId } = ctx;
  const rawUrl = (body as Record<string, unknown>)?.url;
  if (typeof rawUrl !== 'string' || !/^https?:\/\//i.test(rawUrl)) {
    return fail('contract', 'Invalid url');
  }
  const task = await createTask(db, { kind: 'web', url: rawUrl, sourceId: null });
  try {
    await updateTask(db, task.id, { status: 'processing', stage: 'fetching' });
    const outcome = await processCaptureTask(db, config, task, undefined, viewerId);
    await updateTask(db, task.id, { status: 'completed', stage: 'done', completed: true });
    return ok({ ok: true, task_id: task.id, status: 'completed', ...outcome }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Capture failed';
    await updateTask(db, task.id, { status: 'failed', stage: 'error', error: message });
    if (e instanceof SsrfError) return fail('contract', e.message);
    return fail('internal', message);
  }
}

async function hCaptureGet(ctx: RouteCtx): Promise<RouteResult> {
  const task = await getTask(ctx.db, ctx.params[0]);
  if (!task) return fail('not_found', 'Capture task not found');
  return ok({ ok: true, task });
}

async function hProposalsList(ctx: RouteCtx): Promise<RouteResult> {
  const { db, url } = ctx;
  return ok({ ok: true, proposals: await listProposals(db, url.searchParams.get('status') ?? undefined) });
}

async function hProposalsCreate(ctx: RouteCtx): Promise<RouteResult> {
  const { db, body } = ctx;
  const b = body as Parameters<typeof createProposal>[1];
  const proposal = await createProposal(db, b);
  /* V1: proposal trace on the target item (best-effort; target may not exist yet).
     Proposals are machine-originated by definition (source: agent|detector) → actor=agent. */
  try {
    await appendEvent(db, {
      item_id: b.target_id,
      actor: 'agent',
      action: 'proposed',
      detail: b.kind,
    });
  } catch { /* trace must never break the write */ }
  return ok({ ok: true, proposal }, 201);
}

async function hProposalResolve(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params, body } = ctx;
  const proposal = await resolveProposalApplying(db, params[0], (body as { status: 'accepted' | 'rejected' }).status);
  if (!proposal) return fail('not_found', 'Proposal not found');
  return ok({ ok: true, proposal });
}

async function hAgentPropose(ctx: RouteCtx): Promise<RouteResult> {
  const { config, secretsDir, body } = ctx;
  const chunks = (body as Record<string, unknown>)?.chunks;
  if (!Array.isArray(chunks) || chunks.length === 0 || chunks.length > 20
    || chunks.some((c) => typeof (c as Record<string, unknown>)?.content !== 'string')) {
    return fail('contract', 'Invalid chunks');
  }
  try {
    const suggestions = await suggestForChunks(resolveLlmConfig(config, secretsDir), chunks.map((c, index) => ({
      index,
      title: String((c as Record<string, unknown>).title ?? ''),
      content: String((c as Record<string, unknown>).content ?? ''),
    })));
    return ok({ ok: true, suggestions });
  } catch (e) {
    return fail('internal', e instanceof Error ? e.message : 'Agent failed');
  }
}

async function hAgentDetect(ctx: RouteCtx): Promise<RouteResult> {
  try {
    const report = await runDetection(ctx.db);
    return ok({ ok: true, report });
  } catch (e) {
    return fail('internal', e instanceof Error ? e.message : 'Detection failed');
  }
}

async function hLlmConfigGet(ctx: RouteCtx): Promise<RouteResult> {
  const { config, secretsDir } = ctx;
  return ok({ ok: true, config: llmPublicConfig(config, secretsDir) });
}

async function hLlmConfigPatch(ctx: RouteCtx): Promise<RouteResult> {
  const { config, secretsDir, body } = ctx;
  const b = (body ?? {}) as Record<string, unknown>;
  const patch: { provider?: string; base_url?: string; model?: string } = {};
  if (b.provider !== undefined) {
    if (!isProviderId(b.provider)) return fail('contract', 'provider must be a known provider id');
    patch.provider = b.provider;
  }
  if (b.base_url !== undefined) {
    if (typeof b.base_url !== 'string' || !/^https?:\/\//.test(b.base_url) || b.base_url.length > 512) {
      return fail('contract', 'base_url must be an http(s) URL');
    }
    patch.base_url = b.base_url.replace(/\/$/, '');
  }
  if (b.model !== undefined) {
    if (typeof b.model !== 'string' || !b.model.trim() || b.model.length > 128) {
      return fail('contract', 'model must be a non-empty string');
    }
    patch.model = b.model.trim();
  }
  if (b.api_key !== undefined) {
    if (typeof b.api_key !== 'string' || b.api_key.length > 512) {
      return fail('contract', 'api_key must be a string of at most 512 chars');
    }
    // Keys are stored per provider so switching providers keeps each
    // credential. The slot follows the provider in this very patch (the
    // settings write below happens after this, so resolve it explicitly).
    const targetProvider = patch.provider ?? (patch.base_url ? detectProvider(patch.base_url) : undefined);
    if (b.api_key) writeLlmApiKey(secretsDir, b.api_key, targetProvider);
  }
  if (Object.keys(patch).length > 0) writeLlmSettings(secretsDir, patch);
  return ok({ ok: true, config: llmPublicConfig(config, secretsDir) });
}

async function hLlmCheck(ctx: RouteCtx): Promise<RouteResult> {
  const { config, secretsDir } = ctx;
  const effective = resolveLlmConfig(config, secretsDir);
  if (!effective.llmApiKey && !/localhost|127\.0\.0\.1/.test(effective.llmBaseUrl)) {
    return fail('contract', 'API key is not configured yet');
  }
  try {
    const startedAt = Date.now();
    const result = await chatComplete(effective, [
      { role: 'system', content: 'You are a connectivity probe. Reply with exactly: OK' },
      { role: 'user', content: 'ping' },
    ]);
    return ok({
      ok: true,
      model: result.model,
      ms: Date.now() - startedAt,
      reply: result.content.trim().slice(0, 40),
    });
  } catch (e) {
    return fail('internal', e instanceof Error ? e.message : 'LLM check failed');
  }
}

async function hLlmUsage(ctx: RouteCtx): Promise<RouteResult> {
  // LLM cost accounting: factual token totals per model + a clearly-labelled
  // USD estimate (price table in providers.ts; GSC itself bills nothing).
  const { config, secretsDir } = ctx;
  const rows = metrics.llmTokens.snapshot();
  const perModel: Record<string, { prompt_tokens: number; completion_tokens: number }> = {};
  for (const { labels, value } of rows) {
    const model = labels.model ?? 'unknown';
    const slot = (perModel[model] ??= { prompt_tokens: 0, completion_tokens: 0 });
    if (labels.type === 'prompt') slot.prompt_tokens += value;
    if (labels.type === 'completion') slot.completion_tokens += value;
  }
  const provider = detectProvider(resolveLlmConfig(config, secretsDir).llmBaseUrl);
  const price = USD_PER_MILLION[provider] ?? USD_PER_MILLION.custom;
  let prompt_tokens = 0;
  let completion_tokens = 0;
  for (const slot of Object.values(perModel)) {
    prompt_tokens += slot.prompt_tokens;
    completion_tokens += slot.completion_tokens;
  }
  const estimated_usd = (prompt_tokens / 1_000_000) * price.input + (completion_tokens / 1_000_000) * price.output;
  return ok({
    ok: true,
    usage: {
      prompt_tokens,
      completion_tokens,
      estimated_usd: Number(estimated_usd.toFixed(6)),
      price_note: 'estimate only (USD per 1M tokens from public list prices)',
      models: perModel,
    },
  });
}

async function hNewsList(ctx: RouteCtx): Promise<RouteResult> {
  return ok({ ok: true, news: readNews(dirname(ctx.config.pgliteDir)) });
}

async function hNewsCreate(ctx: RouteCtx): Promise<RouteResult> {
  const dir = dirname(ctx.config.pgliteDir);
  const b = (ctx.body ?? {}) as Record<string, unknown>;
  const title = (b.title ?? {}) as Record<string, unknown>;
  if (typeof title.zh !== 'string' && typeof title.en !== 'string') {
    return fail('contract', 'title (zh or en) is required');
  }
  const item = createNewsItem(dir, {
    title: b.title,
    summary: b.summary,
    published: b.published,
  });
  return ok({ ok: true, news: item }, 201);
}

async function hNewsPatch(ctx: RouteCtx): Promise<RouteResult> {
  const dir = dirname(ctx.config.pgliteDir);
  const b = (ctx.body ?? {}) as Record<string, unknown>;
  const item = updateNewsItem(dir, ctx.params[0], {
    title: b.title,
    summary: b.summary,
    published: b.published,
  });
  if (!item) return fail('not_found', 'News item not found');
  return ok({ ok: true, news: item });
}

async function hNewsDelete(ctx: RouteCtx): Promise<RouteResult> {
  const dir = dirname(ctx.config.pgliteDir);
  const removed = deleteNewsItem(dir, ctx.params[0]);
  if (!removed) return fail('not_found', 'News item not found');
  return ok({ ok: true, deleted: true });
}

async function hTagDefsList(ctx: RouteCtx): Promise<RouteResult> {
  /* META_TAG_V1: definitions carry their (multi-parent) group ids. */
  const groups = await listTagGroupIds(ctx.db);
  const defs = await listTagDefinitions(ctx.db);
  return ok({ ok: true, definitions: defs.map((d) => ({ ...d, group_ids: groups.get(d.id) ?? [] })) });
}

async function hMetaGroupsList(ctx: RouteCtx): Promise<RouteResult> {
  return ok({ ok: true, groups: await listMetaGroups(ctx.db) });
}

async function hItemMetaParamsPut(ctx: RouteCtx): Promise<RouteResult> {
  /* Chunk-level meta parameter set (upsert per key). */
  const { db, body, params } = ctx;
  const list = (body as { params?: { key: string; value: string; value_type?: string }[] }).params;
  if (!Array.isArray(list) || list.length < 1 || list.length > 20
    || list.some((p) => typeof p?.key !== 'string' || !p.key || p.key.length > 64
      || typeof p?.value !== 'string' || p.value.length > 2000)) {
    return fail('contract', 'params must be 1..20 {key, value, value_type?}');
  }
  const saved = await setItemParams(db, params[0], list.map((p) => ({ key: p.key, value: p.value, value_type: p.value_type ?? 'text' })));
  return ok({ ok: true, params: saved });
}

async function hTagDefsCreate(ctx: RouteCtx): Promise<RouteResult> {
  const definition = await createTagDefinition(ctx.db, ctx.body as Parameters<typeof createTagDefinition>[1]);
  return ok({ ok: true, definition }, 201);
}

async function hTagValuesList(ctx: RouteCtx): Promise<RouteResult> {
  const { db, url } = ctx;
  return ok({
    ok: true,
    values: await listTagValues(db, {
      itemId: url.searchParams.get('item_id') ?? undefined,
      definitionId: url.searchParams.get('definition_id') ?? undefined,
      ownerId: url.searchParams.get('owner_id') ?? undefined,
    }),
  });
}

async function hTagValuesCreate(ctx: RouteCtx): Promise<RouteResult> {
  const { db, body, viewerId } = ctx;
  const result = await createTagValue(db, body as Parameters<typeof createTagValue>[1], viewerId);
  if (!result.ok) {
    if (result.reason === 'conflict') {
      return fail('conflict', 'This tag value is already assigned (definition, item, value, scope)');
    }
    return fail('contract', 'Unknown tag definition (controlled definitions, D-064)');
  }
  return ok({ ok: true, value: result.value }, 201);
}

async function hTagValuePatch(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params, body, viewerId } = ctx;
  const confirmed = (body as Record<string, unknown>)?.confirmed;
  if (typeof confirmed !== 'boolean') {
    return fail('contract', 'PATCH expects { confirmed: boolean }');
  }
  const value = await setTagValueConfirmed(db, params[0], confirmed, viewerId);
  if (!value) return fail('not_found', 'Tag value not found');
  return ok({ ok: true, value });
}

async function hTagValueDelete(ctx: RouteCtx): Promise<RouteResult> {
  const { db, params, viewerId } = ctx;
  const removed = await deleteTagValue(db, params[0], viewerId);
  if (!removed) return fail('not_found', 'Tag value not found');
  return ok({ ok: true, deleted: true });
}

async function hProfileGet(ctx: RouteCtx): Promise<RouteResult> {
  // Read-only User Profile output for external agents (D-066): confirmed values only.
  const { db, viewerId } = ctx;
  const values = await listTagValues(db, {
    definitionId: PROFILE_DEFINITION_ID,
    ownerId: viewerId,
  });
  return ok({
    ok: true,
    profile: values
      .filter((v) => v.confirmed)
      .map((v) => ({ value: v.value, scope: v.scope })),
  });
}

async function hUsersList(ctx: RouteCtx): Promise<RouteResult> {
  return ok({ ok: true, users: await listUsers(ctx.db) });
}

async function hUsersCreate(ctx: RouteCtx): Promise<RouteResult> {
  const { db, config, body } = ctx;
  const name = (body as Record<string, unknown>)?.name;
  if (typeof name !== 'string' || !name.trim()) return fail('contract', 'Invalid user name');
  const user = await createUser(db, name.trim());
  /* T103: first created user binds as the local account */
  if (!readLocalUserId(dirname(config.pgliteDir))) {
    writeLocalUserId(dirname(config.pgliteDir), user.id);
  }
  return ok({ ok: true, user }, 201);
}

async function hUserDelete(ctx: RouteCtx): Promise<RouteResult> {
  const { db, config, params } = ctx;
  const removed = await deleteUser(db, params[0]);
  if (!removed) return fail('not_found', 'User not found');
  if (readLocalUserId(dirname(config.pgliteDir)) === params[0]) {
    clearLocalUserId(dirname(config.pgliteDir));
  }
  return ok({ ok: true, deleted: true });
}

async function hTokensList(ctx: RouteCtx): Promise<RouteResult> {
  return ok({ ok: true, tokens: listTokens(dirname(ctx.config.pgliteDir)) });
}

async function hTokensCreate(ctx: RouteCtx): Promise<RouteResult> {
  const dir = dirname(ctx.config.pgliteDir);
  const raw = (ctx.body ?? {}) as Record<string, unknown>;
  const name = raw.name;
  const scope: 'read' | 'rw' = raw.scope === 'read' ? 'read' : 'rw';
  if (typeof name !== 'string' || !name.trim()) return fail('contract', 'name is required');
  const created = createApiToken(dir, name.trim(), scope, ctx.viewerId);
  return ok({ ok: true, id: created.id, token: created.token, name: name.trim(), scope }, 201);
}

async function hTokenDelete(ctx: RouteCtx): Promise<RouteResult> {
  const dir = dirname(ctx.config.pgliteDir);
  const revoked = revokeApiToken(dir, ctx.params[0]);
  if (!revoked) return fail('not_found', 'Token not found');
  return ok({ ok: true, deleted: true });
}

async function hOpenApi(): Promise<RouteResult> {
  return ok(buildOpenApi());
}

async function hDocs(ctx: RouteCtx): Promise<RouteResult> {
  const res = ctx.res;
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><meta charset="utf-8"><title>GSC API</title>
<style>body{font:14px/1.6 ui-sans-serif,system-ui,sans-serif;margin:0;padding:32px;color:#171717}h1{font-size:20px}h2{font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;margin:28px 0 8px}.ep{display:flex;gap:10px;align-items:baseline;padding:5px 0;border-bottom:1px solid #E8E8EC}.m{font:600 11px ui-monospace,monospace;width:56px;text-transform:uppercase}.p{font:12px ui-monospace,monospace}.s{color:#6B7280;font-size:12px}code{background:#F1F1F3;padding:1px 5px;border-radius:6px}</style>
<h1>GSC API · OpenAPI 3.1</h1>
<p class="s">Spec: <a href="/api/openapi.json">/api/openapi.json</a> · Auth: <code>Authorization: Bearer &lt;token&gt;</code>（令牌在 设置→连接 里创建）</p>
<div id="root"></div>
<script>
fetch('/api/openapi.json').then(r => r.json()).then(spec => {
  const byTag = {};
  for (const [p, ops] of Object.entries(spec.paths)) {
    for (const [m, op] of Object.entries(ops)) {
      const tag = (op.tags && op.tags[0]) || 'General';
      (byTag[tag] = byTag[tag] || []).push({ m, p, s: op.summary || '' });
    }
  }
  const root = document.getElementById('root');
  for (const [tag, eps] of Object.entries(byTag)) {
    const h = document.createElement('h2'); h.textContent = tag; root.appendChild(h);
    for (const ep of eps) {
      const row = document.createElement('div'); row.className = 'ep';
      row.innerHTML = '<span class="m">' + ep.m + '</span><span class="p">' + ep.p + '</span><span class="s">' + ep.s + '</span>';
      root.appendChild(row);
    }
  }
});
</script>`);
  return; // raw response already sent
}

/* ------------------------------------------------------------------ *
 * Route table (B1): the single source of route truth. KNOWN_ROUTES and
 * the 405/Allow gate derive from it; every declared method has a handler.
 * ------------------------------------------------------------------ */

export const ROUTES: RouteSpec[] = [
  { pattern: /^\/api\/trash$/, ops: [{ method: 'GET', handler: hTrashGet }] },
  { pattern: /^\/api\/items\/([^/]+)\/restore$/, ops: [{ method: 'POST', handler: hItemRestore, idem: true }] },
  { pattern: /^\/api\/items\/([^/]+)\/purge$/, ops: [{ method: 'POST', handler: hItemPurge, idem: true }] },
  { pattern: /^\/api\/search$/, ops: [{ method: 'GET', handler: hSearchGet }] },
  { pattern: /^\/api\/meta\/mcp$/, ops: [{ method: 'GET', handler: hMetaMcpGet }] },
  {
    pattern: /^\/api\/items$/,
    ops: [
      { method: 'GET', handler: hItemsList },
      { method: 'POST', handler: hItemsCreate, validate: validateCreateItemBody, validateMessage: 'Invalid create item body', idem: true },
    ],
  },
  {
    pattern: /^\/api\/items\/([^/]+)$/,
    ops: [
      { method: 'GET', handler: hItemGet },
      { method: 'PATCH', handler: hItemPatch, validate: validateUpdateItemBody, validateMessage: 'Invalid update item body', idem: true },
      { method: 'DELETE', handler: hItemDelete, idem: true },
    ],
  },
  { pattern: /^\/api\/events$/, ops: [{ method: 'GET', handler: hEventsGet }] },
  { pattern: /^\/api\/spatial-layout$/, ops: [{ method: 'GET', handler: hSpatialGet }, { method: 'PUT', handler: hSpatialPut, body: true, idem: true }] },
  {
    pattern: /^\/api\/schedules$/,
    ops: [
      { method: 'GET', handler: hSchedulesList },
      { method: 'POST', handler: hSchedulesCreate, body: true, validate: validateCreateScheduleBody, validateMessage: 'Invalid schedule body', idem: true },
    ],
  },
  {
    pattern: /^\/api\/schedules\/([^/]+)$/,
    ops: [
      { method: 'PATCH', handler: hSchedulePatch, body: true, validate: validateUpdateScheduleBody, validateMessage: 'Invalid schedule patch', idem: true },
      { method: 'DELETE', handler: hScheduleDelete, idem: true },
    ],
  },
  { pattern: /^\/api\/schedules\/([^/]+)\/run$/, ops: [{ method: 'POST', handler: hScheduleRun, idem: true }] },
  {
    pattern: /^\/api\/ingest\/batch$/,
    ops: [{
      method: 'POST',
      handler: hIngestBatch,
      body: true,
      validate: validateIngestBatchBody,
      validateMessage: 'Invalid ingest batch body',
      idem: true,
    }],
  },
  {
    pattern: /^\/api\/relations$/,
    ops: [
      { method: 'GET', handler: hRelationsGet },
      { method: 'POST', handler: hRelationsCreate, validate: validateCreateRelationBody, validateMessage: 'Invalid create relation body', idem: true },
    ],
  },
  {
    pattern: /^\/api\/contexts$/,
    ops: [
      { method: 'GET', handler: hContextsList },
      { method: 'POST', handler: hContextsCreate, validate: validateCreateContextBody, validateMessage: 'Invalid create context body', idem: true },
    ],
  },
  {
    pattern: /^\/api\/contexts\/([^/]+)$/,
    ops: [
      { method: 'GET', handler: hContextGet },
      { method: 'PATCH', handler: hContextPatch, validate: validateUpdateContextBody, validateMessage: 'Invalid update context body', idem: true },
      { method: 'DELETE', handler: hContextDelete, idem: true },
    ],
  },
  {
    pattern: /^\/api\/contexts\/([^/]+)\/members$/,
    ops: [
      { method: 'POST', handler: hContextMemberAdd, validate: validateAddContextMemberBody, validateMessage: 'Invalid member body', idem: true },
      { method: 'DELETE', handler: hContextMemberRemove, validate: validateAddContextMemberBody, validateMessage: 'Invalid member body', idem: true },
    ],
  },
  {
    pattern: /^\/api\/clusters$/,
    ops: [
      { method: 'GET', handler: hClustersList },
      { method: 'POST', handler: hClustersCreate, validate: validateCreateClusterBody, validateMessage: 'Invalid create cluster body', idem: true },
    ],
  },
  {
    pattern: /^\/api\/clusters\/([^/]+)$/,
    ops: [
      { method: 'GET', handler: hClusterGet },
      { method: 'PATCH', handler: hClusterPatch, validate: validateUpdateClusterBody, validateMessage: 'Invalid update cluster body', idem: true },
      { method: 'DELETE', handler: hClusterDelete, idem: true },
    ],
  },
  {
    pattern: /^\/api\/clusters\/([^/]+)\/members$/,
    ops: [
      { method: 'POST', handler: hClusterMemberAdd, validate: validateAddClusterMemberBody, validateMessage: 'Invalid member body', idem: true },
      { method: 'DELETE', handler: hClusterMemberRemove, validate: validateAddClusterMemberBody, validateMessage: 'Invalid member body', idem: true },
    ],
  },
  {
    pattern: /^\/api\/clusters\/([^/]+)\/shares$/,
    ops: [
      { method: 'GET', handler: hClusterSharesList },
      { method: 'POST', handler: hClusterShareCreate, body: true, idem: true },
    ],
  },
  { pattern: /^\/api\/clusters\/([^/]+)\/shares\/([^/]+)$/, ops: [{ method: 'DELETE', handler: hClusterShareRevoke, idem: true }] },
  {
    pattern: /^\/api\/proposals$/,
    ops: [
      { method: 'GET', handler: hProposalsList },
      { method: 'POST', handler: hProposalsCreate, validate: validateCreateProposalBody, validateMessage: 'Invalid create proposal body', idem: true },
    ],
  },
  { pattern: /^\/api\/proposals\/([^/]+)\/resolve$/, ops: [{ method: 'POST', handler: hProposalResolve, validate: validateResolveProposalBody, validateMessage: 'Invalid resolve proposal body', idem: true }] },
  {
    pattern: /^\/api\/sources$/,
    ops: [
      { method: 'GET', handler: hSourcesList },
      { method: 'POST', handler: hSourcesCreate, validate: validateCreateSourceBody, validateMessage: 'Invalid create source body', idem: true },
    ],
  },
  {
    pattern: /^\/api\/sources\/([^/]+)$/,
    ops: [
      { method: 'PATCH', handler: hSourcePatch, validate: validateUpdateSourceBody, validateMessage: 'Invalid update source body', idem: true },
      { method: 'DELETE', handler: hSourceDelete, idem: true },
    ],
  },
  { pattern: /^\/api\/sources\/([^/]+)\/sync$/, ops: [{ method: 'POST', handler: hSourceSync }] },
  { pattern: /^\/api\/ingest\/url$/, ops: [{ method: 'POST', handler: hIngestUrl, body: true, idem: true }] },
  { pattern: /^\/api\/agent\/propose$/, ops: [{ method: 'POST', handler: hAgentPropose, body: true, idem: true }] },
  { pattern: /^\/api\/agent\/detect$/, ops: [{ method: 'POST', handler: hAgentDetect, idem: true }] },
  {
    pattern: /^\/api\/users$/,
    ops: [
      { method: 'GET', handler: hUsersList },
      { method: 'POST', handler: hUsersCreate, body: true, idem: true },
    ],
  },
  { pattern: /^\/api\/users\/([^/]+)$/, ops: [{ method: 'DELETE', handler: hUserDelete, idem: true }] },
  {
    pattern: /^\/api\/tags\/definitions$/,
    ops: [
      { method: 'GET', handler: hTagDefsList },
      { method: 'POST', handler: hTagDefsCreate, validate: validateCreateTagDefinitionBody, validateMessage: 'Invalid tag definition body', idem: true },
    ],
  },
  { pattern: /^\/api\/meta\/groups$/, ops: [{ method: 'GET', handler: hMetaGroupsList }] },
  {
    pattern: /^\/api\/items\/([^/]+)\/meta-params$/,
    ops: [{ method: 'PUT', handler: hItemMetaParamsPut, body: true, idem: true }],
  },
  {
    pattern: /^\/api\/tags\/values$/,
    ops: [
      { method: 'GET', handler: hTagValuesList },
      { method: 'POST', handler: hTagValuesCreate, validate: validateCreateTagValueBody, validateMessage: 'Invalid tag value body', idem: true },
    ],
  },
  {
    pattern: /^\/api\/tags\/values\/([^/]+)$/,
    ops: [
      { method: 'PATCH', handler: hTagValuePatch, body: true, idem: true },
      { method: 'DELETE', handler: hTagValueDelete, idem: true },
    ],
  },
  { pattern: /^\/api\/profile$/, ops: [{ method: 'GET', handler: hProfileGet }] },
  {
    pattern: /^\/api\/llm\/config$/,
    ops: [
      { method: 'GET', handler: hLlmConfigGet },
      { method: 'PATCH', handler: hLlmConfigPatch, body: true, idem: true },
    ],
  },
  { pattern: /^\/api\/llm\/check$/, ops: [{ method: 'POST', handler: hLlmCheck }] },
  { pattern: /^\/api\/llm\/usage$/, ops: [{ method: 'GET', handler: hLlmUsage }] },
  {
    pattern: /^\/api\/news$/,
    ops: [
      { method: 'GET', handler: hNewsList },
      { method: 'POST', handler: hNewsCreate, body: true, idem: true },
    ],
  },
  {
    pattern: /^\/api\/news\/([^/]+)$/,
    ops: [
      { method: 'PATCH', handler: hNewsPatch, body: true, idem: true },
      { method: 'DELETE', handler: hNewsDelete, idem: true },
    ],
  },
  {
    pattern: /^\/api\/capture$/,
    ops: [
      { method: 'GET', handler: hCaptureList },
      { method: 'POST', handler: hCaptureCreate, body: true, idem: true },
    ],
  },
  { pattern: /^\/api\/capture\/([^/]+)$/, ops: [{ method: 'GET', handler: hCaptureGet }] },
  {
    pattern: /^\/api\/tokens$/,
    ops: [
      { method: 'GET', handler: hTokensList },
      { method: 'POST', handler: hTokensCreate, body: true, idem: true },
    ],
  },
  { pattern: /^\/api\/tokens\/([^/]+)$/, ops: [{ method: 'DELETE', handler: hTokenDelete, idem: true }] },
  { pattern: /^\/api\/openapi\.json$/, ops: [{ method: 'GET', handler: hOpenApi }] },
  { pattern: /^\/api\/docs$/, ops: [{ method: 'GET', handler: hDocs }] },
];

/* Route manifest derived from the table above — cannot drift (F9). */
export const KNOWN_ROUTES: { pattern: RegExp; methods: string[] }[] = knownRoutes(ROUTES);

export function createApiRouter(config: Config, db: Database) {
  return async function router(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    // v1 prefix is canonical; bare /api/ remains an alias (D-060)
    const path = url.pathname.replace(/^\/api\/v1(?=\/|$)/, '/api');

    // Ops endpoints (INTEGRATION_HARDENING P0-B): liveness, readiness, metrics.
    // Handled before the /api gate and intentionally excluded from RED metrics —
    // health probes are high-frequency noise that would drown the signal.
    if (url.pathname === '/healthz') {
      sendJson(res, 200, { ok: true, uptime_s: Number(process.uptime().toFixed(1)) });
      return;
    }
    if (url.pathname === '/readyz') {
      try {
        await db.execute(sql`select 1`);
        sendJson(res, 200, { ok: true, db: 'up' });
      } catch (e) {
        sendJson(res, 503, { ok: false, db: 'down', message: e instanceof Error ? e.message : 'db unavailable' });
      }
      return;
    }
    if (url.pathname === '/metrics') {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      res.end(renderMetrics());
      return;
    }

    if (!path.startsWith('/api/')) {
      next();
      return;
    }

    // O1-7: explicit CORS allowlist (default = same-origin only) and preflight.
    // Browsers send Origin on same-origin POSTs too: same-host Origin is allowed
    // without CORS headers (it IS the same origin). Only cross-origin needs the list.
    const headers = req.headers ?? {};
    const origin = headers.origin;
    if (origin) {
      const originHost = safeHost(origin);
      const requestHost = headers.host ?? '';
      const sameOrigin = originHost !== '' && originHost === requestHost;
      if (!sameOrigin && !config.corsOrigins.includes(origin)) {
        sendJson(res, 403, apiError('forbidden', 'Origin not allowed'));
        return;
      }
      if (!sameOrigin) {
        res.setHeader('access-control-allow-origin', origin);
        res.setHeader('vary', 'Origin');
        res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        res.setHeader('access-control-allow-headers', 'content-type, authorization, idempotency-key, x-request-id');
        res.setHeader('access-control-max-age', '600');
      }
    }
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Phase 02: request correlation + structured completion log (no bodies, no titles).
    const reqId = (typeof headers['x-request-id'] === 'string' && headers['x-request-id']) || newRequestId();
    res.setHeader('x-request-id', reqId);
    const startedAt = Date.now();
    const origEnd = res.end.bind(res);
    let logged = false;
    (res as unknown as { end: typeof res.end }).end = ((...args: Parameters<typeof res.end>) => {
      if (!logged) {
        logged = true;
        logRequest({ reqId, method: req.method ?? '?', path, status: res.statusCode, ms: Date.now() - startedAt });
        metrics.httpRequests.inc({ method: req.method ?? '?', route: metricRoute(path), status: String(res.statusCode) });
        metrics.httpDuration.observe({ method: req.method ?? '?', route: metricRoute(path) }, Date.now() - startedAt);
      }
      return origEnd(...args);
    }) as typeof res.end;

    let viewerId = DEFAULT_USER_ID;
    const boundUser = readLocalUserId(dirname(config.pgliteDir));
    if (boundUser && (await getUser(db, boundUser))) viewerId = boundUser;

    if (config.authRequired) {
      const header = headers.authorization ?? '';
      const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
      const token = presented ? verifyApiToken(dirname(config.pgliteDir), presented) : null;
      const needsWrite = req.method !== 'GET' && req.method !== 'HEAD';
      if (!token) {
        // O1-1: missing/invalid credentials are 401, not 400
        sendJson(res, 401, apiError('unauthorized', 'Missing or invalid token'));
        return;
      }
      if (needsWrite && token.scope !== 'rw') {
        sendJson(res, 403, apiError('forbidden', 'read-only token cannot write'));
        return;
      }
      viewerId = token.userId;
    }

    // O1-5: token-bucket throttle per identity (token id or client IP)
    const rateRule = rateRuleFor(path, req.method ?? 'GET');
    if (rateRule) {
      // Key by token identity when authenticated, else by socket address (XFF is spoofable;
      // trust-proxy support is a documented limitation for multi-instance deployments).
      const rateKey = `${rateRule.name}:${viewerId !== DEFAULT_USER_ID ? viewerId : (req.socket?.remoteAddress ?? 'local')}`;
      const wait = rateLimiter.take(rateKey, rateRule.rule);
      if (wait !== null) {
        res.setHeader('retry-after', String(wait));
        sendJson(res, 429, apiError('rate_limited', `Too many requests; retry in ${wait}s`));
        return;
      }
    }

    // PLAN-7 (D-062/D-063): shared-cluster visibility over items and clusters (B2: one decision point).
    const authz = createAuthz(config, db, viewerId);
    const handled = await dispatch(ROUTES, {
      req,
      res,
      url,
      path,
      config,
      db,
      secretsDir: dirname(config.pgliteDir),
      viewerId,
      authz,
    });
    if (handled) return;

    sendJson(res, 404, apiError('not_found', 'Unknown API route'));
  };
}
