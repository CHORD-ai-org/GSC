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

describe('V4 kept-tier spatial layout (Phase 07 M4)', () => {
  it('round-trips per-row coordinates with replace + owner isolation', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-v4spatial-'));
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

      // write A's layout (mixed valid/missing ids — missing dropped, never throws)
      let res = await call('PUT', '/api/spatial-layout?page=raw', {
        items: [
          { item_id: a1, x: 10, y: 20 },
          { item_id: a2, x: 180, y: 20 },
          { item_id: 'item_ghost', x: 0, y: 0 },
        ],
        replace: true,
      }, tokenA.token);
      expect(res.status).toBe(200);
      expect(res.json.saved).toBe(2);

      res = await call('GET', '/api/spatial-layout?page=raw', undefined, tokenA.token);
      expect(res.json.positions).toHaveLength(2);
      expect(res.json.positions.find((p: { item_id: string; x: number }) => p.item_id === a1).x).toBe(10);

      // owner isolation: B sees nothing of A's layout, can write own
      res = await call('GET', '/api/spatial-layout?page=raw', undefined, tokenB.token);
      expect(res.json.positions).toHaveLength(0);
      res = await call('PUT', '/api/spatial-layout?page=raw', {
        items: [{ item_id: b1, x: 5, y: 5 }], replace: true,
      }, tokenB.token);
      expect(res.json.saved).toBe(1);

      // replace=true clears scope; upsert without replace merges
      res = await call('PUT', '/api/spatial-layout?page=raw', {
        items: [{ item_id: a2, x: 300, y: 300 }], replace: true,
      }, tokenA.token);
      expect(res.json.saved).toBe(1);
      res = await call('GET', '/api/spatial-layout?page=raw', undefined, tokenA.token);
      expect(res.json.positions).toHaveLength(1);
      expect(res.json.positions[0].x).toBe(300);

      // contract guards
      expect((await call('GET', '/api/spatial-layout', undefined, tokenA.token)).status).toBe(400);
      expect((await call('PUT', '/api/spatial-layout?page=raw', { items: [{ item_id: a1 }] }, tokenA.token)).status).toBe(400);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
