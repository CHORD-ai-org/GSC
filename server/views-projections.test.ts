import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readConfig } from './config.ts';
import { createApiRouter } from './router.ts';
import { createDatabase } from './persistence/client.ts';
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

function fakeReq(method: string, url: string, body?: unknown, token?: string): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  const req = Readable.from([payload]) as IncomingMessage;
  req.method = method;
  req.url = url;
  if (token) req.headers = { authorization: `Bearer ${token}` };
  return req;
}

describe('V2 read-only projections (Phase 07 M2)', () => {
  it('GET /api/events streams batched events scoped to visible items', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-v2events-'));
    try {
      const handle = createDatabase();
      await handle.exec(migrationSql());
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite'), GSC_AUTH_REQUIRED: '1' });
      const router = createApiRouter(config, handle.db);
      const call = async (method: string, url: string, body?: unknown, token?: string) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body, token) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };
      const tokenRoot = createApiToken(dir, 'root', 'rw');
      const userA = await call('POST', '/api/users', { name: 'A' }, tokenRoot.token);
      const userB = await call('POST', '/api/users', { name: 'B' }, tokenRoot.token);
      const tokenA = createApiToken(dir, 'a', 'rw', userA.json.user.id);
      const tokenB = createApiToken(dir, 'b', 'rw', userB.json.user.id);

      const mk = async (title: string, token: string) => (await call('POST', '/api/items', {
        type: 'raw.document', title, domain: 'knowledge', origin: 'user', fields: { content_text: 'x' },
      }, token)).json.item.id as string;
      const a1 = await mk('A one', tokenA.token);
      const a2 = await mk('A two', tokenA.token);
      const b1 = await mk('B one', tokenB.token);

      const res = await call('GET', `/api/events?item_ids=${a1},${a2},${b1}`, undefined, tokenA.token);
      expect(res.status).toBe(200);
      const owners = new Set(res.json.events.map((e: { item_id: string }) => e.item_id));
      expect(owners.has(a1)).toBe(true);
      expect(owners.has(a2)).toBe(true);
      expect(owners.has(b1)).toBe(false); // foreign item filtered

      const bad = await call('GET', '/api/events', undefined, tokenA.token);
      expect(bad.status).toBe(400);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('GET /api/relations batch-lists edges with both-ends visibility', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-v2rel-'));
    try {
      const handle = createDatabase();
      await handle.exec(migrationSql());
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite'), GSC_AUTH_REQUIRED: '1' });
      const router = createApiRouter(config, handle.db);
      const call = async (method: string, url: string, body?: unknown, token?: string) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body, token) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };
      const tokenRoot = createApiToken(dir, 'root', 'rw');
      const userA = await call('POST', '/api/users', { name: 'A' }, tokenRoot.token);
      const userB = await call('POST', '/api/users', { name: 'B' }, tokenRoot.token);
      const tokenA = createApiToken(dir, 'a', 'rw', userA.json.user.id);
      const tokenB = createApiToken(dir, 'b', 'rw', userB.json.user.id);

      const mk = async (title: string, token: string) => (await call('POST', '/api/items', {
        type: 'object.concept', title, domain: 'knowledge', origin: 'user', fields: { definition: 'd' },
      }, token)).json.item.id as string;
      const a1 = await mk('C1', tokenA.token);
      const a2 = await mk('C2', tokenA.token);
      const b1 = await mk('C3', tokenB.token);

      expect((await call('POST', '/api/relations', { from_id: a1, to_id: a2, kind: 'related_to' }, tokenA.token)).status).toBe(201);
      expect((await call('POST', '/api/relations', { from_id: a1, to_id: b1, kind: 'related_to' }, tokenB.token)).status).toBe(201);

      const res = await call('GET', `/api/relations?item_ids=${a1},${a2},${b1}`, undefined, tokenA.token);
      expect(res.status).toBe(200);
      const pairs = res.json.relations.map((r: { from_id: string; to_id: string }) => `${r.from_id}>${r.to_id}`);
      expect(pairs).toContain(`${a1}>${a2}`);
      expect(pairs.some((p: string) => p.includes(b1))).toBe(false); // cross-owner edge hidden from A
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
