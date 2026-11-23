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
import { clusterShareEvents } from './persistence/schema.ts';

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

describe('shared clusters (PLAN-7)', () => {
  it('shares member chunks only, revokes instantly, and audits grants', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-share-'));
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

      const tokenRoot = createApiToken(dir, 'root', 'rw'); // default usr_local (seeded)
      const userA = await call('POST', '/api/users', { name: 'Alice' }, tokenRoot.token);
      const userB = await call('POST', '/api/users', { name: 'Bob' }, tokenRoot.token);
      const tokenA = createApiToken(dir, 'alice', 'rw', userA.json.user.id);
      const tokenB = createApiToken(dir, 'bob', 'rw', userB.json.user.id);

      // A creates a private chunk and a shared cluster with one member
      const priv = await call('POST', '/api/items', {
        type: 'raw.document', title: 'A private note', domain: 'knowledge', origin: 'user',
        fields: { content_text: 'secret plans' },
      }, tokenA.token);
      const shared = await call('POST', '/api/items', {
        type: 'raw.document', title: 'Shared research', domain: 'knowledge', origin: 'user',
        fields: { content_text: 'shared body' },
      }, tokenA.token);
      const cluster = await call('POST', '/api/clusters', { title: 'Agent Architecture Research' }, tokenA.token);
      await call('POST', `/api/clusters/${cluster.json.cluster.id}/members`, { item_id: shared.json.item.id }, tokenA.token);

      // B sees nothing before the share
      const beforeList = await call('GET', '/api/items', undefined, tokenB.token);
      expect(beforeList.json.items).toHaveLength(0);
      const beforeDetail = await call('GET', `/api/items/${priv.json.item.id}`, undefined, tokenB.token);
      expect(beforeDetail.status).toBe(404);

      // A shares (view) with B by name
      const share = await call('POST', `/api/clusters/${cluster.json.cluster.id}/shares`, { name: 'Bob', role: 'view' }, tokenA.token);
      expect(share.status).toBe(201);
      expect(share.json.shares[0].role).toBe('view');

      // B can read the member chunk but not the private one
      const afterList = await call('GET', '/api/items', undefined, tokenB.token);
      expect(afterList.json.items.map((i: { id: string }) => i.id)).toEqual([shared.json.item.id]);
      const memberDetail = await call('GET', `/api/items/${shared.json.item.id}`, undefined, tokenB.token);
      expect(memberDetail.status).toBe(200);
      const privateDetail = await call('GET', `/api/items/${priv.json.item.id}`, undefined, tokenB.token);
      expect(privateDetail.status).toBe(404);

      // B cannot mutate A's member chunk; A's cluster is view-only for B.
      // D-092 policy: visible but not permitted → 403 (was 400 'contract').
      const attempt = await call('PATCH', `/api/items/${shared.json.item.id}`, { title: 'hijack' }, tokenB.token);
      expect(attempt.status).toBe(403);
      const memberAttempt = await call('POST', `/api/clusters/${cluster.json.cluster.id}/members`, { item_id: priv.json.item.id }, tokenB.token);
      expect(memberAttempt.status).toBe(403);

      // Revoke → immediate loss of access
      const revoke = await call('DELETE', `/api/clusters/${cluster.json.cluster.id}/shares/${userB.json.user.id}`, undefined, tokenA.token);
      expect(revoke.json.deleted).toBe(true);
      const afterRevoke = await call('GET', '/api/items', undefined, tokenB.token);
      expect(afterRevoke.json.items).toHaveLength(0);

      // Audit trail has grant + revoke
      const auditRows = await handle.db.select().from(clusterShareEvents);
      expect(auditRows.map((r) => r.action).sort()).toEqual(['granted', 'revoked']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
