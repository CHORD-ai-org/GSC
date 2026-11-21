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

describe('owner isolation (IDOR hardening)', () => {
  it('denies cross-user restore/purge of items and access to contexts/sources', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-authz-'));
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
      const userA = await call('POST', '/api/users', { name: 'Alice' }, tokenRoot.token);
      const userB = await call('POST', '/api/users', { name: 'Bob' }, tokenRoot.token);
      const tokenA = createApiToken(dir, 'alice', 'rw', userA.json.user.id);
      const tokenB = createApiToken(dir, 'bob', 'rw', userB.json.user.id);

      // --- item restore/purge must be owner-only (the destructive IDOR fix) ---
      const item = await call('POST', '/api/items', {
        type: 'raw.document', title: 'A doc', domain: 'knowledge', origin: 'user',
        fields: { content_text: 'x' },
      }, tokenA.token);
      const itemId = item.json.item.id;
      await call('DELETE', `/api/items/${itemId}`, undefined, tokenA.token); // soft-delete
      expect((await call('POST', `/api/items/${itemId}/restore`, undefined, tokenB.token)).status).toBe(404);
      expect((await call('POST', `/api/items/${itemId}/purge`, undefined, tokenB.token)).status).toBe(404);
      expect((await call('POST', `/api/items/${itemId}/restore`, undefined, tokenA.token)).status).toBe(200);

      // --- context must be owner-scoped ---
      const ctx = await call('POST', '/api/contexts', { title: 'C', subject: 's', scope: 'sc', purpose: 'p' }, tokenA.token);
      const ctxId = ctx.json.context.id;
      expect((await call('GET', `/api/contexts/${ctxId}`, undefined, tokenB.token)).status).toBe(404);
      expect((await call('GET', `/api/contexts/${ctxId}`, undefined, tokenA.token)).status).toBe(200);

      // --- source (holds tokens) must be owner-scoped: sync + delete ---
      const src = await call('POST', '/api/sources', { kind: 'file', label: 'f.md', scope: 'body' }, tokenA.token);
      const srcId = src.json.source.id;
      expect((await call('POST', `/api/sources/${srcId}/sync`, undefined, tokenB.token)).status).toBe(404);
      expect((await call('DELETE', `/api/sources/${srcId}`, undefined, tokenB.token)).status).toBe(404);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
