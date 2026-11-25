import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readConfig } from './config.ts';
import { createApiRouter } from './router.ts';
import { createDatabase } from './persistence/client.ts';
import type { DatabaseHandle } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import { createApiToken } from './storage/tokens.ts';

function fakeRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200, body: '', headers,
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

describe('G2 integrations management', () => {
  it('serves allowlisted files, reports status, and the test link pushes through the real ingest path', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-intg-'));
    try {
      const handle: DatabaseHandle = createDatabase();
      await handle.exec(migrationSql());
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite'), GSC_AUTH_REQUIRED: '1' });
      const router = createApiRouter(config, handle.db);
      const call = async (method: string, url: string, body?: unknown, token?: string) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body, token) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };
      const tokenRoot = createApiToken(dir, 'root', 'rw');
      const user = await call('POST', '/api/users', { name: 'S' }, tokenRoot.token);
      const token = createApiToken(dir, 's', 'rw', user.json.user.id);

      // downloads: allowlist + base64 payload
      const file = await call('GET', '/api/integrations/files/gsc-push.mjs', undefined, token.token);
      expect(file.status).toBe(200);
      expect(file.json.name).toBe('gsc-push.mjs');
      expect(Buffer.from(file.json.content_base64, 'base64').toString('utf-8')).toContain('gsc-push');
      expect((await call('GET', '/api/integrations/files/evil.sh', undefined, token.token)).status).toBe(404);

      // status: all clients reported, none connected yet
      const status = await call('GET', '/api/integrations/status', undefined, token.token);
      expect(status.json.clients.map((c: { client: string }) => c.client)).toEqual(['opencode', 'codex', 'workbuddy', 'manual']);

      // test link: real ingest round-trip
      const test = await call('POST', '/api/integrations/test', { client: 'workbuddy' }, token.token);
      expect(test.status).toBe(200);
      expect(test.json.result.imported).toBe(1);

      // now workbuddy shows connected with an anchor
      const after = await call('GET', '/api/integrations/status', undefined, token.token);
      const wb = after.json.clients.find((c: { client: string }) => c.client === 'workbuddy');
      expect(wb.connected).toBe(true);
      expect(wb.anchors).toContain('agent:workbuddy:gsc-selftest');

      // contract: bad client refused
      expect((await call('POST', '/api/integrations/test', { client: 'evil' }, token.token)).status).toBe(400);
      await handle.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
