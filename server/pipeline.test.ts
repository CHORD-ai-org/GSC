import { describe, expect, it, beforeAll } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readConfig } from './config.ts';
import { createApiRouter, ROUTES } from './router.ts';
import { createAuthz } from './authz.ts';
import { routeToPath } from './openapi.ts';
import { createDatabase } from './persistence/client.ts';
import type { DatabaseHandle } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import { createApiToken } from './storage/tokens.ts';

function fakeRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    body: '',
    headers,
    setHeader(name: string, value: string) { headers[name] = String(value); },
    end(chunk?: string) { res.body = chunk ?? ''; },
  };
  return res;
}

function fakeReq(method: string, url: string, body?: unknown, token?: string, idemKey?: string): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  const req = Readable.from([payload]) as IncomingMessage;
  req.method = method;
  req.url = url;
  req.headers = {};
  if (token) req.headers.authorization = `Bearer ${token}`;
  if (idemKey) req.headers['idempotency-key'] = idemKey;
  return req;
}

let handle: DatabaseHandle;
let dir: string;
let call: (method: string, url: string, body?: unknown, token?: string, idemKey?: string) => Promise<{ status: number; json: Record<string, unknown> }>;
let tokenA: string;
let tokenB: string;
let idA: string;
let idB: string;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'gsc-pipeline-'));
  handle = createDatabase();
  await handle.exec(migrationSql());
  const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite'), GSC_AUTH_REQUIRED: '1' });
  const router = createApiRouter(config, handle.db);
  call = async (method, url, body, token, idemKey) => {
    const res = fakeRes();
    await router(fakeReq(method, url, body, token, idemKey) as IncomingMessage, res as unknown as ServerResponse, () => {});
    return { status: res.statusCode, json: JSON.parse(res.body || '{}') as Record<string, unknown> };
  };
  const root = createApiToken(dir, 'root', 'rw');
  const userA = await call('POST', '/api/users', { name: 'Alice' }, root.token);
  const userB = await call('POST', '/api/users', { name: 'Bob' }, root.token);
  idA = (userA.json.user as { id: string }).id;
  idB = (userB.json.user as { id: string }).id;
  tokenA = createApiToken(dir, 'alice', 'rw', idA).token;
  tokenB = createApiToken(dir, 'bob', 'rw', idB).token;
});

describe('route pipeline (B1)', () => {
  it('every write op declares idem except the documented run-action exceptions', () => {
    for (const route of ROUTES) {
      for (const op of route.ops) {
        if (op.method === 'GET') continue;
        const p = routeToPath(route.pattern.source);
        // Run-once actions: triggering again should re-run, not replay a stored response.
        if (p === '/api/sources/{id}/sync' || p === '/api/llm/check' || p === '/api/tts') continue; // 运行型动作：每次真生成
        expect(op.idem, `${op.method} ${p}`).toBe(true);
      }
    }
  });

  it('allows only declared methods per route (405 + Allow) and 404s unknown paths', async () => {
    const wrong = await call('DELETE', '/api/items', undefined, tokenA);
    expect(wrong.status).toBe(405);
    const unknown = await call('POST', '/api/nope', {}, tokenA);
    expect(unknown.status).toBe(404);
    // The phantom /api/items/:id/relations route (B1 drift finding) must stay gone.
    const phantom = await call('POST', '/api/items/raw_x/relations', {}, tokenA);
    expect(phantom.status).toBe(404);
  });

  it('validates bodies before the handler runs (400 contract)', async () => {
    const bad = await call('POST', '/api/items', { type: 'raw.document' }, tokenA);
    expect(bad.status).toBe(400);
    expect(bad.json.kind).toBe('contract');
  });

  it('replays the first response for a repeated Idempotency-Key on several write endpoints', async () => {
    // POST item: same key twice → one row created.
    const first = await call('POST', '/api/items', { type: 'raw.document', title: 'Idem', domain: 'knowledge', origin: 'user', fields: { content_text: 'x' } }, tokenA, 'key-item-1');
    const replay = await call('POST', '/api/items', { type: 'raw.document', title: 'Idem', domain: 'knowledge', origin: 'user', fields: { content_text: 'x' } }, tokenA, 'key-item-1');
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.json).toEqual(first.json);

    // POST context: same behavior via the same pipeline path.
    const ctxBody = { title: 'Idem ctx', subject: 's', scope: 'sc', purpose: 'p' };
    const c1 = await call('POST', '/api/contexts', ctxBody, tokenA, 'key-ctx-1');
    const c2 = await call('POST', '/api/contexts', ctxBody, tokenA, 'key-ctx-1');
    expect(c1.status).toBe(201);
    expect(c2.json).toEqual(c1.json);

    // PATCH item: replay returns the stored response instead of re-updating.
    const itemId = (first.json.item as { id: string }).id;
    const u1 = await call('PATCH', `/api/items/${itemId}`, { title: 'Idem v2' }, tokenA, 'key-patch-1');
    const u2 = await call('PATCH', `/api/items/${itemId}`, { title: 'Idem v2' }, tokenA, 'key-patch-1');
    expect(u2.json).toEqual(u1.json);

    // Same key + different body → 409.
    const mismatch = await call('PATCH', `/api/items/${itemId}`, { title: 'different' }, tokenA, 'key-patch-1');
    expect(mismatch.status).toBe(409);
  });
});

describe('list scoping and write policy (B2)', () => {
  it('scopes contexts/clusters/sources lists and item total to the viewer', async () => {
    const made = [
      await call('POST', '/api/items', { type: 'raw.document', title: 'A1', domain: 'knowledge', origin: 'user', fields: { content_text: 'x' } }, tokenA),
      await call('POST', '/api/contexts', { title: 'A ctx', subject: 's', scope: 'sc', purpose: 'p' }, tokenA),
      await call('POST', '/api/clusters', { title: 'A cluster', description: 'd' }, tokenA),
      await call('POST', '/api/sources', { kind: 'file', label: 'a.md', scope: 'Body.', frequency: 'manual' }, tokenA),
    ];
    for (const r of made) expect(r.status).toBe(201);

    const contextsB = await call('GET', '/api/contexts', undefined, tokenB);
    const clustersB = await call('GET', '/api/clusters', undefined, tokenB);
    const sourcesB = await call('GET', '/api/sources', undefined, tokenB);
    expect((contextsB.json.contexts as unknown[]).length).toBe(0);
    expect((clustersB.json.clusters as unknown[]).length).toBe(0);
    expect((sourcesB.json.sources as unknown[]).length).toBe(0);

    const itemsB = await call('GET', '/api/items', undefined, tokenB);
    expect(itemsB.json.total).toBe(0);
    expect((itemsB.json.items as unknown[]).length).toBe(0);

    const itemsA = await call('GET', '/api/items', undefined, tokenA);
    expect(itemsA.json.total).toBe((itemsA.json.items as unknown[]).length);
    expect((itemsA.json.items as unknown[]).length).toBeGreaterThan(0);
    expect(((await call('GET', '/api/contexts', undefined, tokenA)).json.contexts as unknown[]).length).toBeGreaterThanOrEqual(1);
    expect(((await call('GET', '/api/clusters', undefined, tokenA)).json.clusters as unknown[]).length).toBeGreaterThanOrEqual(1);
    expect(((await call('GET', '/api/sources', undefined, tokenA)).json.sources as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('itemWriteDenied: null for owner, hidden for stranger, forbidden for shared viewer', async () => {
    const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite'), GSC_AUTH_REQUIRED: '1' });
    const created = await call('POST', '/api/items', { type: 'raw.document', title: 'Policy probe', domain: 'knowledge', origin: 'user', fields: { content_text: 'x' } }, tokenA);
    const itemId = (created.json.item as { id: string }).id;
    const cluster = await call('POST', '/api/clusters', { title: 'Policy cluster', description: 'd' }, tokenA);
    const clusterId = (cluster.json.cluster as { id: string }).id;
    await call('POST', `/api/clusters/${clusterId}/members`, { item_id: itemId }, tokenA);
    const shared = await call('POST', `/api/clusters/${clusterId}/shares`, { user_id: idB }, tokenA);
    expect(shared.status).toBe(201);

    expect(await createAuthz(config, handle.db, idA).itemWriteDenied(itemId)).toBeNull();
    expect(await createAuthz(config, handle.db, 'usr_stranger').itemWriteDenied(itemId)).toBe('hidden');
    // B can see the item through the shared cluster but may not write it → forbidden.
    expect(await createAuthz(config, handle.db, idB).itemWriteDenied(itemId)).toBe('forbidden');
  });
});
