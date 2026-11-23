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
import { ApiFailure, readJson, sendApiError, sendJson } from './http.ts';
import { metrics, renderMetrics } from './metrics.ts';
import { sql } from 'drizzle-orm';
import { RateLimiter, rateRuleFor } from './ratelimit.ts';
import { idempotentWrite, newRequestId } from './idempotency.ts';
import { logRequest } from './log.ts';
import { chatComplete } from './agent/llm.ts';
import { clearLocalUserId, llmPublicConfig, readLocalUserId, resolveLlmConfig, writeLlmApiKey, writeLlmSettings, writeLocalUserId } from './storage/settings.ts';
import { isProviderId, detectProvider, USD_PER_MILLION } from '../src/lib/providers.ts';
import { buildOpenApi } from './openapi.ts';
import { createNewsItem, deleteNewsItem, readNews, updateNewsItem } from './storage/news.ts';
import { createItem, deleteItem, getItem, listDeletedItems, listItems, listItemsPaged, purgeItem, restoreItem, updateItem } from './repo/items.ts';
import { searchAll } from './repo/search.ts';
import { createRelation, listRelations, listRelationsForItems } from './repo/relations.ts';
import { listEvents, listEventsForItems, appendEvent, activityCountsByItem } from './repo/events.ts';
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
import { runSourceSync, processCaptureTask } from './intel/pipeline.ts';
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
  shareFor,
} from './repo/users.ts';
import { clusterOwner, itemOwner, itemOwners, sharedItemIds } from './repo/clusters.ts';
import { clusterMembers } from './persistence/schema.ts';
import { eq } from 'drizzle-orm';
import { dirname } from 'node:path';
import { fetchUrlText, SsrfError } from './ingest/html.ts';
import { storeTextFile } from './storage/local.ts';

const rateLimiter = new RateLimiter(); // O1-5: single-process bucket store

function safeHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return '';
  }
}

/* Known routes: powers the 405 + Allow fallback (O1-1). */
/* V1 engagement traces: throttle duplicate 'opened' events per viewer+item (10 min). */
const openThrottle = new Map<string, number>();

export const KNOWN_ROUTES: { pattern: RegExp; methods: string[] }[] = [
  { pattern: /^\/api\/items$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/search$/, methods: ['GET'] },
  { pattern: /^\/api\/trash$/, methods: ['GET'] },
  { pattern: /^\/api\/items\/[^/]+\/restore$/, methods: ['POST'] },
  { pattern: /^\/api\/items\/[^/]+\/purge$/, methods: ['POST'] },
  { pattern: /^\/api\/items\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/api\/items\/[^/]+\/relations$/, methods: ['POST', 'DELETE'] },
  { pattern: /^\/api\/relations$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/events$/, methods: ['GET'] },
  { pattern: /^\/api\/contexts$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/contexts\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/api\/contexts\/[^/]+\/members$/, methods: ['POST', 'DELETE'] },
  { pattern: /^\/api\/clusters$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/clusters\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/api\/clusters\/[^/]+\/members$/, methods: ['POST', 'DELETE'] },
  { pattern: /^\/api\/clusters\/[^/]+\/shares$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/clusters\/[^/]+\/shares\/[^/]+$/, methods: ['DELETE'] },
  { pattern: /^\/api\/proposals$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/proposals\/[^/]+\/resolve$/, methods: ['POST'] },
  { pattern: /^\/api\/sources$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/sources\/[^/]+$/, methods: ['PATCH', 'DELETE'] },
  { pattern: /^\/api\/sources\/[^/]+\/sync$/, methods: ['POST'] },
  { pattern: /^\/api\/ingest\/url$/, methods: ['POST'] },
  { pattern: /^\/api\/agent\/propose$/, methods: ['POST'] },
  { pattern: /^\/api\/agent\/detect$/, methods: ['POST'] },
  { pattern: /^\/api\/users$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/users\/[^/]+$/, methods: ['DELETE'] },
  { pattern: /^\/api\/tags\/definitions$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/tags\/values$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/tags\/values\/[^/]+$/, methods: ['PATCH', 'DELETE'] },
  { pattern: /^\/api\/profile$/, methods: ['GET'] },
  { pattern: /^\/api\/llm\/config$/, methods: ['GET', 'PATCH'] },
  { pattern: /^\/api\/llm\/check$/, methods: ['POST'] },
  { pattern: /^\/api\/llm\/usage$/, methods: ['GET'] },
  { pattern: /^\/api\/news$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/news\/[^/]+$/, methods: ['PATCH', 'DELETE'] },
  { pattern: /^\/api\/capture$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/capture\/[^/]+$/, methods: ['GET'] },
  { pattern: /^\/api\/tokens$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/openapi\.json$/, methods: ['GET'] },
  { pattern: /^\/api\/docs$/, methods: ['GET'] },
  { pattern: /^\/api\/tokens\/[^/]+$/, methods: ['DELETE'] },
];

function allowedMethodsFor(path: string): string[] | undefined {
  for (const route of KNOWN_ROUTES) {
    if (route.pattern.test(path)) return route.methods;
  }
  return undefined;
}

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
        sendApiError(res, apiError('forbidden', 'Origin not allowed'));
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
        sendApiError(res, apiError('unauthorized', 'Missing or invalid token'));
        return;
      }
      if (needsWrite && token.scope !== 'rw') {
        sendApiError(res, apiError('forbidden', 'read-only token cannot write'));
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
        sendApiError(res, apiError('rate_limited', `Too many requests; retry in ${wait}s`));
        return;
      }
    }

    try {
      // PLAN-7 (D-062/D-063): shared-cluster visibility over items and clusters.
      const unrestricted = !config.authRequired && viewerId === DEFAULT_USER_ID;

      async function canViewItem(itemId: string): Promise<boolean> {
        if (unrestricted) return true;
        const owner = await itemOwner(db, itemId);
        if (owner === viewerId) return true;
        const memberships = await db
          .select({ cluster_id: clusterMembers.cluster_id })
          .from(clusterMembers)
          .where(eq(clusterMembers.item_id, itemId));
        for (const m of memberships) {
          if (await shareFor(db, m.cluster_id, viewerId)) return true;
        }
        return false;
      }

      async function visibleItemIds(): Promise<Set<string> | null> {
        if (unrestricted) return null; // null = no filtering
        const visible = new Set<string>();
        const all = await listItems(db);
        // N+1 fix: batch owner resolution + one query for shared-cluster members.
        const owners = await itemOwners(db, all.map((i) => i.id));
        for (const item of all) {
          if (owners.get(item.id) === viewerId) visible.add(item.id);
        }
        for (const id of await sharedItemIds(db, viewerId)) visible.add(id);
        return visible;
      }

      async function clusterRole(clusterId: string): Promise<'owner' | 'view' | 'add' | null> {
        if (unrestricted) return 'owner';
        if ((await clusterOwner(db, clusterId)) === viewerId) return 'owner';
        return await shareFor(db, clusterId, viewerId);
      }

      if (path === '/api/trash' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, items: await listDeletedItems(db) });
        return;
      }

      const restoreMatch = path.match(/^\/api\/items\/([^/]+)\/restore$/);
      if (restoreMatch && req.method === 'POST') {
        if (!unrestricted && (await itemOwner(db, restoreMatch[1])) !== viewerId) {
          sendApiError(res, apiError('not_found', 'Item not found'));
          return;
        }
        const ok = await restoreItem(db, restoreMatch[1]);
        if (!ok) {
          sendApiError(res, apiError('not_found', 'Item not found'));
          return;
        }
        sendJson(res, 200, { ok: true, restored: true });
        return;
      }

      const purgeMatch = path.match(/^\/api\/items\/([^/]+)\/purge$/);
      if (purgeMatch && req.method === 'POST') {
        if (!unrestricted && (await itemOwner(db, purgeMatch[1])) !== viewerId) {
          sendApiError(res, apiError('not_found', 'Item not found'));
          return;
        }
        const ok = await purgeItem(db, purgeMatch[1]);
        if (!ok) {
          sendApiError(res, apiError('not_found', 'Item not found'));
          return;
        }
        sendJson(res, 200, { ok: true, purged: true });
        return;
      }

      if (path === '/api/search' && req.method === 'GET') {
        const q = url.searchParams.get('q') ?? '';
        const hits = await searchAll(db, q);
        const allowed = await visibleItemIds();
        sendJson(res, 200, { ok: true, hits: allowed ? hits.filter((h) => h.group !== 'items' && h.group !== 'objects' ? true : allowed.has(h.id)) : hits });
        return;
      }

      if (path === '/api/items' && req.method === 'GET') {
        const filters = {
          type: url.searchParams.get('type') ?? undefined,
          domain: url.searchParams.get('domain') ?? undefined,
          q: url.searchParams.get('q') ?? undefined,
        };
        const allowed = await visibleItemIds();
        /* T202: cursor pagination — cursor/limit present or always (default 50) */
        const page = await listItemsPaged(db, {
          ...filters,
          cursor: url.searchParams.get('cursor') ?? undefined,
          limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
        });
        const items = allowed ? page.items.filter((i) => allowed.has(i.id)) : page.items;
        /* V1 engagement traces: per-item user/agent counts (batched, no N+1). */
        const activity = await activityCountsByItem(db, items.map((i) => i.id));
        sendJson(res, 200, {
          ok: true,
          items,
          next_cursor: page.next_cursor,
          total: page.total,
          activity: Object.fromEntries(activity),
        });
        return;
      }

      if (path === '/api/items' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateItemBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create item body'));
          return;
        }
        const idemKey = typeof headers['idempotency-key'] === 'string' ? headers['idempotency-key'] : undefined;
        const result = await idempotentWrite(db, idemKey, 'POST /api/items', body, async () => {
          const item = await createItem(db, body, async (id, fields) => {
            if (body.type !== 'raw.filecontent') return fields;
            const stored = await storeTextFile(
              config,
              id,
              fields.filename ?? 'import.txt',
              fields.content_text ?? '',
            );
            return { ...fields, ...stored };
          }, viewerId);
          return { status: 201, json: { ok: true, item } };
        });
        sendJson(res, result.status, result.json);
        return;
      }

      const detailMatch = path.match(/^\/api\/items\/([^/]+)$/);
      if (detailMatch && req.method === 'GET') {
        const item = await getItem(db, detailMatch[1]);
        if (!item || !(await canViewItem(item.id))) {
          sendApiError(res, apiError('not_found', 'Item not found'));
          return;
        }
        const [relations, history] = await Promise.all([
          listRelations(db, item.id),
          listEvents(db, item.id),
        ]);
        /* V1: record an 'opened' trace (throttled per viewer+item, 10 min). */
        const throttleKey = `${viewerId}:${item.id}`;
        const lastOpen = openThrottle.get(throttleKey) ?? 0;
        if (Date.now() - lastOpen > 10 * 60_000) {
          openThrottle.set(throttleKey, Date.now());
          await appendEvent(db, { item_id: item.id, actor: 'user', action: 'opened', detail: '' });
        }
        sendJson(res, 200, { ok: true, item, relations, events: history });
        return;
      }

      if (detailMatch && req.method === 'PATCH') {
        const body = await readJson(req);
        if (!validateUpdateItemBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid update item body'));
          return;
        }
        if (!unrestricted && (await itemOwner(db, detailMatch[1])) !== viewerId) {
          sendApiError(res, apiError('contract', 'Only the owner can edit this item'));
          return;
        }
        const item = await updateItem(db, detailMatch[1], body);
        if (!item) {
          sendApiError(res, apiError('not_found', 'Item not found'));
          return;
        }
        sendJson(res, 200, { ok: true, item });
        return;
      }

      if (detailMatch && req.method === 'DELETE') {
        if (!unrestricted && (await itemOwner(db, detailMatch[1])) !== viewerId) {
          sendApiError(res, apiError('contract', 'Only the owner can delete this item'));
          return;
        }
        const removed = await deleteItem(db, detailMatch[1]);
        if (!removed) {
          sendApiError(res, apiError('not_found', 'Item not found'));
          return;
        }
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }

      if (path === '/api/events' && req.method === 'GET') {
        /* V2 (M2) timeline projection: batched read-only event stream. */
        const ids = (url.searchParams.get('item_ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
        if (ids.length === 0) {
          sendApiError(res, apiError('contract', 'item_ids required'));
          return;
        }
        const allowed = await visibleItemIds();
        const scoped = allowed ? ids.filter((id) => allowed.has(id)) : ids;
        const stream = await listEventsForItems(db, scoped, {
          since: url.searchParams.get('since') ?? undefined,
          limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
        });
        sendJson(res, 200, { ok: true, events: stream });
        return;
      }

      if (path === '/api/relations' && req.method === 'GET') {
        /* V2 (M2) relations projection: batched read-only edge listing. */
        const ids = (url.searchParams.get('item_ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
        if (ids.length === 0) {
          sendApiError(res, apiError('contract', 'item_ids required'));
          return;
        }
        const allowed = await visibleItemIds();
        const scoped = allowed ? ids.filter((id) => allowed.has(id)) : ids;
        const edges = await listRelationsForItems(db, scoped);
        const out = allowed ? edges.filter((r) => allowed.has(r.from_id) && allowed.has(r.to_id)) : edges;
        sendJson(res, 200, { ok: true, relations: out });
        return;
      }

      if (path === '/api/relations' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateRelationBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create relation body'));
          return;
        }
        const idemKey = typeof headers['idempotency-key'] === 'string' ? headers['idempotency-key'] : undefined;
        const result = await idempotentWrite(db, idemKey, 'POST /api/relations', body, async () => {
          const created = await createRelation(db, body);
          if (!created.ok) {
            return { status: created.reason === 'not_found' ? 404 : 409, json: apiError(created.reason, created.message) };
          }
          return { status: 201, json: { ok: true, relation: created.relation } };
        });
        sendJson(res, result.status, result.json);
        return;
      }

      if (path === '/api/contexts' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, contexts: await listContexts(db) });
        return;
      }

      if (path === '/api/contexts' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateContextBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create context body'));
          return;
        }
        sendJson(res, 201, { ok: true, context: await createContext(db, body, viewerId) });
        return;
      }

      // Contexts are owner-scoped (no share mechanism): enforce ownership on
      // /api/contexts/:id and /api/contexts/:id/members (IDOR guard).
      const contextOwnerMatch = path.match(/^\/api\/contexts\/([^/]+)(?:\/members)?$/);
      if (contextOwnerMatch && !unrestricted && (await contextOwner(db, contextOwnerMatch[1])) !== viewerId) {
        sendApiError(res, apiError('not_found', 'Context not found'));
        return;
      }

      const contextMatch = path.match(/^\/api\/contexts\/([^/]+)$/);
      if (contextMatch && req.method === 'GET') {
        const context = await getContext(db, contextMatch[1]);
        if (!context) {
          sendApiError(res, apiError('not_found', 'Context not found'));
          return;
        }
        sendJson(res, 200, { ok: true, context });
        return;
      }

      if (contextMatch && req.method === 'PATCH') {
        const body = await readJson(req);
        if (!validateUpdateContextBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid update context body'));
          return;
        }
        const context = await updateContext(db, contextMatch[1], body);
        if (!context) {
          sendApiError(res, apiError('not_found', 'Context not found'));
          return;
        }
        sendJson(res, 200, { ok: true, context });
        return;
      }

      if (contextMatch && req.method === 'DELETE') {
        const ok = await deleteContext(db, contextMatch[1]);
        if (!ok) {
          sendApiError(res, apiError('not_found', 'Context not found'));
          return;
        }
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }

      const memberMatch = path.match(/^\/api\/contexts\/([^/]+)\/members$/);
      if (memberMatch && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateAddContextMemberBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid member body'));
          return;
        }
        const result = await addContextMember(db, memberMatch[1], body.item_id);
        if (!result.ok) {
          sendApiError(res, apiError(result.reason, result.message));
          return;
        }
        sendJson(res, 201, { ok: true, context: result.context });
        return;
      }

      if (memberMatch && req.method === 'DELETE') {
        const body = await readJson(req);
        if (!validateAddContextMemberBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid member body'));
          return;
        }
        const result = await removeContextMember(db, memberMatch[1], body.item_id);
        if (!result.ok) {
          sendApiError(res, apiError(result.reason, result.message));
          return;
        }
        sendJson(res, 200, { ok: true, context: result.context });
        return;
      }

      if (path === '/api/clusters' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, clusters: await listClusters(db) });
        return;
      }

      if (path === '/api/clusters' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateClusterBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create cluster body'));
          return;
        }
        sendJson(res, 201, { ok: true, cluster: await createCluster(db, body, viewerId) });
        return;
      }

      const clusterMatch = path.match(/^\/api\/clusters\/([^/]+)$/);
      if (clusterMatch && req.method === 'GET') {
        const role = await clusterRole(clusterMatch[1]);
        if (!role) {
          sendApiError(res, apiError('not_found', 'Cluster not found'));
          return;
        }
        const cluster = await getCluster(db, clusterMatch[1]);
        if (!cluster) {
          sendApiError(res, apiError('not_found', 'Cluster not found'));
          return;
        }
        sendJson(res, 200, { ok: true, cluster });
        return;
      }

      if (clusterMatch && req.method === 'PATCH') {
        const body = await readJson(req);
        if (!validateUpdateClusterBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid update cluster body'));
          return;
        }
        const role = await clusterRole(clusterMatch[1]);
        if (role !== 'owner') {
          sendApiError(res, apiError('contract', 'Only the owner can edit a cluster'));
          return;
        }
        const cluster = await updateCluster(db, clusterMatch[1], body);
        if (!cluster) {
          sendApiError(res, apiError('not_found', 'Cluster not found'));
          return;
        }
        sendJson(res, 200, { ok: true, cluster });
        return;
      }

      if (clusterMatch && req.method === 'DELETE') {
        const role = await clusterRole(clusterMatch[1]);
        if (role !== 'owner') {
          sendApiError(res, apiError('contract', 'Only the owner can delete a cluster'));
          return;
        }
        const removed = await deleteCluster(db, clusterMatch[1]);
        if (!removed) {
          sendApiError(res, apiError('not_found', 'Cluster not found'));
          return;
        }
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }

      const clusterShareUserMatch = path.match(/^\/api\/clusters\/([^/]+)\/shares\/([^/]+)$/);
      if (clusterShareUserMatch && req.method === 'DELETE') {
        const role = await clusterRole(clusterShareUserMatch[1]);
        if (role !== 'owner') {
          sendApiError(res, apiError('contract', 'Only the owner can manage shares'));
          return;
        }
        const revoked = await revokeShare(db, clusterShareUserMatch[1], clusterShareUserMatch[2]);
        if (!revoked) {
          sendApiError(res, apiError('not_found', 'Share not found'));
          return;
        }
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }

      const clusterShareMatch = path.match(/^\/api\/clusters\/([^/]+)\/shares$/);
      if (clusterShareMatch && req.method === 'GET') {
        const role = await clusterRole(clusterShareMatch[1]);
        if (role !== 'owner') {
          sendApiError(res, apiError('contract', 'Only the owner can view shares'));
          return;
        }
        sendJson(res, 200, { ok: true, shares: await listShares(db, clusterShareMatch[1]) });
        return;
      }

      if (clusterShareMatch && req.method === 'POST') {
        const role = await clusterRole(clusterShareMatch[1]);
        if (role !== 'owner') {
          sendApiError(res, apiError('contract', 'Only the owner can manage shares'));
          return;
        }
        const body = await readJson(req) as Record<string, unknown>;
        const shareRole = body?.role === 'add' ? 'add' : 'view';
        let userId = typeof body?.user_id === 'string' ? body.user_id : '';
        if (!userId && typeof body?.name === 'string') {
          const found = (await listUsers(db)).find((u) => u.name === body.name);
          if (!found) {
            sendApiError(res, apiError('not_found', 'User not found'));
            return;
          }
          userId = found.id;
        }
        if (!userId || !(await getUser(db, userId))) {
          sendApiError(res, apiError('contract', 'Invalid user'));
          return;
        }
        const result = await shareCluster(db, clusterShareMatch[1], userId, shareRole);
        if (!result.ok) {
          sendApiError(res, apiError(result.reason, result.message));
          return;
        }
        sendJson(res, 201, { ok: true, shares: await listShares(db, clusterShareMatch[1]) });
        return;
      }

      const clusterMemberMatch = path.match(/^\/api\/clusters\/([^/]+)\/members$/);
      if (clusterMemberMatch && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateAddClusterMemberBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid member body'));
          return;
        }
        const role = await clusterRole(clusterMemberMatch[1]);
        if (role !== 'owner' && role !== 'add') {
          sendApiError(res, apiError('contract', 'View-only share cannot add members'));
          return;
        }
        const result = await addClusterMember(db, clusterMemberMatch[1], body.item_id);
        if (!result.ok) {
          sendApiError(res, apiError(result.reason, result.message));
          return;
        }
        sendJson(res, 201, { ok: true, cluster: await getCluster(db, clusterMemberMatch[1]) });
        return;
      }

      if (clusterMemberMatch && req.method === 'DELETE') {
        const body = await readJson(req);
        if (!validateAddClusterMemberBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid member body'));
          return;
        }
        const role = await clusterRole(clusterMemberMatch[1]);
        if (role !== 'owner') {
          sendApiError(res, apiError('contract', 'Only the owner can remove members'));
          return;
        }
        const result = await removeClusterMember(db, clusterMemberMatch[1], body.item_id);
        if (!result.ok) {
          sendApiError(res, apiError(result.reason, result.message));
          return;
        }
        sendJson(res, 200, { ok: true, cluster: await getCluster(db, clusterMemberMatch[1]) });
        return;
      }

      if (path === '/api/sources' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, sources: await listSources(db) });
        return;
      }

      const secretsDir = dirname(config.pgliteDir);

      if (path === '/api/users' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, users: await listUsers(db) });
        return;
      }

      if (path === '/api/users' && req.method === 'POST') {
        const body = await readJson(req);
        const name = (body as Record<string, unknown>)?.name;
        if (typeof name !== 'string' || !name.trim()) {
          sendApiError(res, apiError('contract', 'Invalid user name'));
          return;
        }
        const user = await createUser(db, name.trim());
        /* T103: first created user binds as the local account */
        if (!readLocalUserId(dirname(config.pgliteDir))) {
          writeLocalUserId(dirname(config.pgliteDir), user.id);
        }
        sendJson(res, 201, { ok: true, user });
        return;
      }

      const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
      if (userMatch && req.method === 'DELETE') {
        const ok = await deleteUser(db, userMatch[1]);
        if (!ok) {
          sendApiError(res, apiError('not_found', 'User not found'));
          return;
        }
        if (readLocalUserId(dirname(config.pgliteDir)) === userMatch[1]) {
          clearLocalUserId(dirname(config.pgliteDir));
        }
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }

      if (path === '/api/sources' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateSourceBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create source body'));
          return;
        }
        const source = await createSource(db, body, viewerId);
        if (body.token) writeSecret(secretsDir, source.id, body.token);
        sendJson(res, 201, { ok: true, source });
        return;
      }

      // Sources are owner-scoped: enforce ownership on /api/sources/:id and
      // /api/sources/:id/sync (IDOR guard).
      const sourceOwnerMatch = path.match(/^\/api\/sources\/([^/]+)(?:\/sync)?$/);
      if (sourceOwnerMatch && !unrestricted && (await sourceOwner(db, sourceOwnerMatch[1])) !== viewerId) {
        sendApiError(res, apiError('not_found', 'Source not found'));
        return;
      }

      const sourceMatch = path.match(/^\/api\/sources\/([^/]+)$/);
      if (sourceMatch && req.method === 'PATCH') {
        const body = await readJson(req);
        if (!validateUpdateSourceBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid update source body'));
          return;
        }
        const source = await updateSource(db, sourceMatch[1], body);
        if (!source) {
          sendApiError(res, apiError('not_found', 'Source not found'));
          return;
        }
        if (typeof body.token === 'string') writeSecret(secretsDir, source.id, body.token);
        sendJson(res, 200, { ok: true, source });
        return;
      }

      if (sourceMatch && req.method === 'DELETE') {
        const removed = await deleteSource(db, sourceMatch[1]);
        if (!removed) {
          sendApiError(res, apiError('not_found', 'Source not found'));
          return;
        }
        writeSecret(secretsDir, sourceMatch[1], '');
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }

      const sourceSyncMatch = path.match(/^\/api\/sources\/([^/]+)\/sync$/);
      if (sourceSyncMatch && req.method === 'POST') {
        const source = await getSource(db, sourceSyncMatch[1]);
        if (!source) {
          sendApiError(res, apiError('not_found', 'Source not found'));
          return;
        }
        if (source.status === 'paused') {
          sendApiError(res, apiError('conflict', 'Source is paused'));
          return;
        }
        try {
          const token = readSecret(secretsDir, source.id);
          const result = source.kind === 'github'
            ? await runGithubSync(db, source, token)
            : await runSourceSync(db, config, source, token);
          await markSync(db, source.id, { ok: true });
          sendJson(res, 200, { ok: true, result });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Sync failed';
          await markSync(db, source.id, { ok: false, message });
          sendApiError(res, apiError('internal', message));
        }
        return;
      }

      if (path === '/api/ingest/url' && req.method === 'POST') {
        const body = await readJson(req);
        const rawUrl = (body as Record<string, unknown>)?.url;
        if (typeof rawUrl !== 'string' || !/^https?:\/\//i.test(rawUrl)) {
          sendApiError(res, apiError('contract', 'Invalid url'));
          return;
        }
        try {
          const result = await fetchUrlText(rawUrl, { allowPrivate: config.allowPrivateIngest });
          sendJson(res, 200, { ok: true, ...result });
        } catch (e) {
          if (e instanceof SsrfError) {
            sendApiError(res, apiError('contract', e.message));
            return;
          }
          sendApiError(res, apiError('internal', e instanceof Error ? e.message : 'Fetch failed'));
        }
        return;
      }

      // Web Intelligence MVP: explicit URL capture → task → extract → Light Up.
      // Smallest reliable implementation: run the task inline through the real
      // lifecycle (create → processing → completed/failed). A separate async worker
      // can later drain the queue via claimNextTask; processCaptureTask is idempotent.
      // Capture center (Web Intel §6.1): recent capture tasks with real stages.
      if (path === '/api/capture' && req.method === 'GET') {
        const rows = await listTasks(db, 50);
        sendJson(res, 200, {
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
        return;
      }

      if (path === '/api/capture' && req.method === 'POST') {
        const body = await readJson(req);
        const rawUrl = (body as Record<string, unknown>)?.url;
        if (typeof rawUrl !== 'string' || !/^https?:\/\//i.test(rawUrl)) {
          sendApiError(res, apiError('contract', 'Invalid url'));
          return;
        }
        const task = await createTask(db, { kind: 'web', url: rawUrl, sourceId: null });
        try {
          await updateTask(db, task.id, { status: 'processing', stage: 'fetching' });
          const outcome = await processCaptureTask(db, config, task, undefined, viewerId);
          await updateTask(db, task.id, { status: 'completed', stage: 'done', completed: true });
          sendJson(res, 201, { ok: true, task_id: task.id, status: 'completed', ...outcome });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Capture failed';
          await updateTask(db, task.id, { status: 'failed', stage: 'error', error: message });
          if (e instanceof SsrfError) {
            sendApiError(res, apiError('contract', e.message));
            return;
          }
          sendApiError(res, apiError('internal', message));
        }
        return;
      }

      const captureStatusMatch = path.match(/^\/api\/capture\/([^/]+)$/);
      if (captureStatusMatch && req.method === 'GET') {
        const task = await getTask(db, captureStatusMatch[1]);
        if (!task) {
          sendApiError(res, apiError('not_found', 'Capture task not found'));
          return;
        }
        sendJson(res, 200, { ok: true, task });
        return;
      }

      if (path === '/api/proposals' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, proposals: await listProposals(db, url.searchParams.get('status') ?? undefined) });
        return;
      }

      if (path === '/api/proposals' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateProposalBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create proposal body'));
          return;
        }
        const proposal = await createProposal(db, body);
        /* V1: proposal trace on the target item (best-effort; target may not exist yet).
           Proposals are machine-originated by definition (source: agent|detector) → actor=agent. */
        try {
          await appendEvent(db, {
            item_id: body.target_id,
            actor: 'agent',
            action: 'proposed',
            detail: body.kind,
          });
        } catch { /* trace must never break the write */ }
        sendJson(res, 201, { ok: true, proposal });
        return;
      }

      const proposalMatch = path.match(/^\/api\/proposals\/([^/]+)\/resolve$/);
      if (proposalMatch && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateResolveProposalBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid resolve proposal body'));
          return;
        }
        const idemKey = typeof headers['idempotency-key'] === 'string' ? headers['idempotency-key'] : undefined;
        const result = await idempotentWrite(db, idemKey, `POST ${path}`, body, async () => {
          const proposal = await resolveProposalApplying(db, proposalMatch[1], body.status);
          if (!proposal) {
            return { status: 404, json: apiError('not_found', 'Proposal not found') };
          }
          return { status: 200, json: { ok: true, proposal } };
        });
        sendJson(res, result.status, result.json);
        return;
      }

      if (path === '/api/agent/propose' && req.method === 'POST') {
        const body = await readJson(req);
        const chunks = (body as Record<string, unknown>)?.chunks;
        if (!Array.isArray(chunks) || chunks.length === 0 || chunks.length > 20
          || chunks.some((c) => typeof (c as Record<string, unknown>)?.content !== 'string')) {
          sendApiError(res, apiError('contract', 'Invalid chunks'));
          return;
        }
        try {
          const suggestions = await suggestForChunks(resolveLlmConfig(config, secretsDir), chunks.map((c, index) => ({
            index,
            title: String((c as Record<string, unknown>).title ?? ''),
            content: String((c as Record<string, unknown>).content ?? ''),
          })));
          sendJson(res, 200, { ok: true, suggestions });
        } catch (e) {
          sendApiError(res, apiError('internal', e instanceof Error ? e.message : 'Agent failed'));
        }
        return;
      }

      if (path === '/api/agent/detect' && req.method === 'POST') {
        try {
          const report = await runDetection(db);
          sendJson(res, 200, { ok: true, report });
        } catch (e) {
          sendApiError(res, apiError('internal', e instanceof Error ? e.message : 'Detection failed'));
        }
        return;
      }

      // Settings UI: runtime LLM provider configuration (key stored encrypted, never returned).
      if (path === '/api/llm/config' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, config: llmPublicConfig(config, secretsDir) });
        return;
      }

      if (path === '/api/llm/config' && req.method === 'PATCH') {
        const body = await readJson(req);
        const b = (body ?? {}) as Record<string, unknown>;
        const patch: { provider?: string; base_url?: string; model?: string } = {};
        if (b.provider !== undefined) {
          if (!isProviderId(b.provider)) {
            sendApiError(res, apiError('contract', 'provider must be a known provider id'));
            return;
          }
          patch.provider = b.provider;
        }
        if (b.base_url !== undefined) {
          if (typeof b.base_url !== 'string' || !/^https?:\/\//.test(b.base_url) || b.base_url.length > 512) {
            sendApiError(res, apiError('contract', 'base_url must be an http(s) URL'));
            return;
          }
          patch.base_url = b.base_url.replace(/\/$/, '');
        }
        if (b.model !== undefined) {
          if (typeof b.model !== 'string' || !b.model.trim() || b.model.length > 128) {
            sendApiError(res, apiError('contract', 'model must be a non-empty string'));
            return;
          }
          patch.model = b.model.trim();
        }
        if (b.api_key !== undefined) {
          if (typeof b.api_key !== 'string' || b.api_key.length > 512) {
            sendApiError(res, apiError('contract', 'api_key must be a string of at most 512 chars'));
            return;
          }
          // Keys are stored per provider so switching providers keeps each
          // credential. The slot follows the provider in this very patch (the
          // settings write below happens after this, so resolve it explicitly).
          const targetProvider = patch.provider ?? (patch.base_url ? detectProvider(patch.base_url) : undefined);
          if (b.api_key) writeLlmApiKey(secretsDir, b.api_key, targetProvider);
        }
        if (Object.keys(patch).length > 0) writeLlmSettings(secretsDir, patch);
        sendJson(res, 200, { ok: true, config: llmPublicConfig(config, secretsDir) });
        return;
      }

      if (path === '/api/llm/check' && req.method === 'POST') {
        const effective = resolveLlmConfig(config, secretsDir);
        if (!effective.llmApiKey && !/localhost|127\.0\.0\.1/.test(effective.llmBaseUrl)) {
          sendApiError(res, apiError('contract', 'API key is not configured yet'));
          return;
        }
        try {
          const startedAt = Date.now();
          const result = await chatComplete(effective, [
            { role: 'system', content: 'You are a connectivity probe. Reply with exactly: OK' },
            { role: 'user', content: 'ping' },
          ]);
          sendJson(res, 200, {
            ok: true,
            model: result.model,
            ms: Date.now() - startedAt,
            reply: result.content.trim().slice(0, 40),
          });
        } catch (e) {
          sendApiError(res, apiError('internal', e instanceof Error ? e.message : 'LLM check failed'));
        }
        return;
      }

      // PLAN-8 (D-064/D-066): Meta Tag definitions, values and profile output.
      // Settings -> News management: admin-authored announcements (news.json).
      // LLM cost accounting: factual token totals per model + a clearly-labelled
      // USD estimate (price table in providers.ts; GSC itself bills nothing).
      if (path === '/api/llm/usage' && req.method === 'GET') {
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
        sendJson(res, 200, {
          ok: true,
          usage: {
            prompt_tokens,
            completion_tokens,
            estimated_usd: Number(estimated_usd.toFixed(6)),
            price_note: 'estimate only (USD per 1M tokens from public list prices)',
            models: perModel,
          },
        });
        return;
      }

      if (path === '/api/news' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, news: readNews(dirname(config.pgliteDir)) });
        return;
      }

      if (path === '/api/news' && req.method === 'POST') {
        const body = await readJson(req);
        const b = (body ?? {}) as Record<string, unknown>;
        const title = (b.title ?? {}) as Record<string, unknown>;
        if (typeof title.zh !== 'string' && typeof title.en !== 'string') {
          sendApiError(res, apiError('contract', 'title (zh or en) is required'));
          return;
        }
        const item = createNewsItem(dirname(config.pgliteDir), {
          title: b.title,
          summary: b.summary,
          published: b.published,
        });
        sendJson(res, 201, { ok: true, news: item });
        return;
      }

      const newsMatch = path.match(/^\/api\/news\/([^/]+)$/);
      if (newsMatch && req.method === 'PATCH') {
        const body = await readJson(req);
        const b = (body ?? {}) as Record<string, unknown>;
        const item = updateNewsItem(dirname(config.pgliteDir), newsMatch[1], {
          title: b.title,
          summary: b.summary,
          published: b.published,
        });
        if (!item) {
          sendApiError(res, apiError('not_found', 'News item not found'));
          return;
        }
        sendJson(res, 200, { ok: true, news: item });
        return;
      }

      if (newsMatch && req.method === 'DELETE') {
        const ok = deleteNewsItem(dirname(config.pgliteDir), newsMatch[1]);
        if (!ok) {
          sendApiError(res, apiError('not_found', 'News item not found'));
          return;
        }
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }

      if (path === '/api/tags/definitions' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, definitions: await listTagDefinitions(db) });
        return;
      }

      if (path === '/api/tags/definitions' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateTagDefinitionBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid tag definition body'));
          return;
        }
        sendJson(res, 201, { ok: true, definition: await createTagDefinition(db, body) });
        return;
      }

      if (path === '/api/tags/values' && req.method === 'GET') {
        sendJson(res, 200, {
          ok: true,
          values: await listTagValues(db, {
            itemId: url.searchParams.get('item_id') ?? undefined,
            definitionId: url.searchParams.get('definition_id') ?? undefined,
            ownerId: url.searchParams.get('owner_id') ?? undefined,
          }),
        });
        return;
      }

      if (path === '/api/tags/values' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateTagValueBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid tag value body'));
          return;
        }
        const result = await createTagValue(db, body, viewerId);
        if (!result.ok) {
          if (result.reason === 'conflict') {
            sendApiError(res, apiError('conflict', 'This tag value is already assigned (definition, item, value, scope)'));
          } else {
            sendApiError(res, apiError('contract', 'Unknown tag definition (controlled definitions, D-064)'));
          }
          return;
        }
        sendJson(res, 201, { ok: true, value: result.value });
        return;
      }

      const tagValueMatch = path.match(/^\/api\/tags\/values\/([^/]+)$/);
      if (tagValueMatch && req.method === 'PATCH') {
        const body = await readJson(req);
        const confirmed = (body as Record<string, unknown>)?.confirmed;
        if (typeof confirmed !== 'boolean') {
          sendApiError(res, apiError('contract', 'PATCH expects { confirmed: boolean }'));
          return;
        }
        const value = await setTagValueConfirmed(db, tagValueMatch[1], confirmed, viewerId);
        if (!value) {
          sendApiError(res, apiError('not_found', 'Tag value not found'));
          return;
        }
        sendJson(res, 200, { ok: true, value });
        return;
      }

      if (tagValueMatch && req.method === 'DELETE') {
        const removed = await deleteTagValue(db, tagValueMatch[1], viewerId);
        if (!removed) {
          sendApiError(res, apiError('not_found', 'Tag value not found'));
          return;
        }
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }

      // Read-only User Profile output for external agents (D-066): confirmed values only.
      if (path === '/api/profile' && req.method === 'GET') {
        const values = await listTagValues(db, {
          definitionId: PROFILE_DEFINITION_ID,
          ownerId: viewerId,
        });
        sendJson(res, 200, {
          ok: true,
          profile: values
            .filter((v) => v.confirmed)
            .map((v) => ({ value: v.value, scope: v.scope })),
        });
        return;
      }

      // Token / Agent access management (T301, GAP-04): see and manage PAT access.
      if (path === '/api/tokens' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, tokens: listTokens(dirname(config.pgliteDir)) });
        return;
      }
      if (path === '/api/tokens' && req.method === 'POST') {
        const body = await readJson(req);
        const raw = (body ?? {}) as Record<string, unknown>;
        const name = raw.name;
        const scope: 'read' | 'rw' = raw.scope === 'read' ? 'read' : 'rw';
        if (typeof name !== 'string' || !name.trim()) {
          sendApiError(res, apiError('contract', 'name is required'));
          return;
        }
        const created = createApiToken(dirname(config.pgliteDir), name.trim(), scope, viewerId);
        sendJson(res, 201, { ok: true, id: created.id, token: created.token, name: name.trim(), scope });
        return;
      }
      const tokenMatch = path.match(/^\/api\/tokens\/([^/]+)$/);
      if (tokenMatch && req.method === 'DELETE') {
        const ok = revokeApiToken(dirname(config.pgliteDir), tokenMatch[1]);
        if (!ok) {
          sendApiError(res, apiError('not_found', 'Token not found'));
          return;
        }
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }

      // OpenAPI 3.1 spec + a self-contained docs page (INTEGRATION_HARDENING P1).
      if (path === '/api/openapi.json' && req.method === 'GET') {
        sendJson(res, 200, buildOpenApi());
        return;
      }
      if (path === '/api/docs' && req.method === 'GET') {
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
        return;
      }

      const allowed = allowedMethodsFor(path);
      if (allowed) {
        res.setHeader('allow', allowed.join(', '));
        sendApiError(res, apiError('method_not_allowed', `Method ${req.method} not allowed`));
        return;
      }
      sendJson(res, 404, apiError('not_found', 'Unknown API route'));
    } catch (error) {
      if (error instanceof ApiFailure) {
        sendApiError(res, error.api);
        return;
      }
      const message = error instanceof Error ? error.message : 'Internal error';
      sendApiError(res, apiError('internal', message));
    }
  };
}
