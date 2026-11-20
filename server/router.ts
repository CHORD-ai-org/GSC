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
import { readJson, sendApiError, sendJson } from './http.ts';
import { createItem, deleteItem, getItem, listItems, updateItem } from './repo/items.ts';
import { createRelation, listRelations } from './repo/relations.ts';
import { listEvents } from './repo/events.ts';
import {
  addContextMember,
  createContext,
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
  updateSource,
} from './repo/sources.ts';
import {
  validateCreateSourceBody,
  validateUpdateSourceBody,
} from '../src/lib/sources.ts';
import { runGithubSync } from './sync/github.ts';
import { suggestForChunks } from './agent/proposer.ts';
import { runDetection } from './agent/detector.ts';
import { readSecret, writeSecret } from './storage/secrets.ts';
import { DEFAULT_USER_ID, verifyApiToken } from './storage/tokens.ts';
import {
  createUser,
  getUser,
  listShares,
  listUsers,
  revokeShare,
  shareCluster,
  shareFor,
} from './repo/users.ts';
import { clusterOwner, itemOwner } from './repo/clusters.ts';
import { clusterMembers } from './persistence/schema.ts';
import { eq } from 'drizzle-orm';
import { dirname } from 'node:path';
import { fetchUrlText } from './ingest/html.ts';
import { storeTextFile } from './storage/local.ts';

export function createApiRouter(config: Config, db: Database) {
  return async function router(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    // v1 prefix is canonical; bare /api/ remains an alias (D-060)
    const path = url.pathname.replace(/^\/api\/v1(?=\/|$)/, '/api');

    if (!path.startsWith('/api/')) {
      next();
      return;
    }

    let viewerId = DEFAULT_USER_ID;

    if (config.authRequired) {
      const header = req.headers.authorization ?? '';
      const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
      const token = presented ? verifyApiToken(dirname(config.pgliteDir), presented) : null;
      const needsWrite = req.method !== 'GET' && req.method !== 'HEAD';
      if (!token || (needsWrite && token.scope !== 'rw')) {
        sendApiError(res, apiError('contract', token ? 'read-only token cannot write' : 'Missing or invalid token'));
        return;
      }
      viewerId = token.userId;
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
        for (const item of all) {
          if ((await itemOwner(db, item.id)) === viewerId) visible.add(item.id);
        }
        const allClusters = await listClusters(db);
        for (const cluster of allClusters) {
          if (!(await shareFor(db, cluster.id, viewerId))) continue;
          const detail = await getCluster(db, cluster.id);
          for (const id of detail?.member_ids ?? []) visible.add(id);
        }
        return visible;
      }

      async function clusterRole(clusterId: string): Promise<'owner' | 'view' | 'add' | null> {
        if (unrestricted) return 'owner';
        if ((await clusterOwner(db, clusterId)) === viewerId) return 'owner';
        return await shareFor(db, clusterId, viewerId);
      }

      if (path === '/api/items' && req.method === 'GET') {
        const items = await listItems(db, {
          type: url.searchParams.get('type') ?? undefined,
          domain: url.searchParams.get('domain') ?? undefined,
          q: url.searchParams.get('q') ?? undefined,
        });
        const allowed = await visibleItemIds();
        sendJson(res, 200, { ok: true, items: allowed ? items.filter((i) => allowed.has(i.id)) : items });
        return;
      }

      if (path === '/api/items' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateItemBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create item body'));
          return;
        }
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
        sendJson(res, 201, { ok: true, item });
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

      if (path === '/api/relations' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateRelationBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create relation body'));
          return;
        }
        const result = await createRelation(db, body);
        if (!result.ok) {
          sendApiError(res, apiError(result.reason, result.message));
          return;
        }
        sendJson(res, 201, { ok: true, relation: result.relation });
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
        sendJson(res, 201, { ok: true, context: await createContext(db, body) });
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
        sendJson(res, 201, { ok: true, user: await createUser(db, name.trim()) });
        return;
      }

      if (path === '/api/sources' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateSourceBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create source body'));
          return;
        }
        const source = await createSource(db, body);
        if (body.token) writeSecret(secretsDir, source.id, body.token);
        sendJson(res, 201, { ok: true, source });
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
        if (source.kind !== 'github') {
          sendApiError(res, apiError('contract', `Sync for ${source.kind} is not implemented yet (PLAN-3 B3-1)`));
          return;
        }
        try {
          const result = await runGithubSync(db, source, readSecret(secretsDir, source.id));
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
          const result = await fetchUrlText(rawUrl);
          sendJson(res, 200, { ok: true, ...result });
        } catch (e) {
          sendApiError(res, apiError('internal', e instanceof Error ? e.message : 'Fetch failed'));
        }
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
        sendJson(res, 201, { ok: true, proposal: await createProposal(db, body) });
        return;
      }

      const proposalMatch = path.match(/^\/api\/proposals\/([^/]+)\/resolve$/);
      if (proposalMatch && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateResolveProposalBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid resolve proposal body'));
          return;
        }
        const proposal = await resolveProposalApplying(db, proposalMatch[1], body.status);
        if (!proposal) {
          sendApiError(res, apiError('not_found', 'Proposal not found'));
          return;
        }
        sendJson(res, 200, { ok: true, proposal });
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
          const suggestions = await suggestForChunks(config, chunks.map((c, index) => ({
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

      sendJson(res, 404, apiError('not_found', 'Unknown API route'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      sendApiError(res, apiError('internal', message));
    }
  };
}
