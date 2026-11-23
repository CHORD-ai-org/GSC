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

describe('V1 engagement traces (Phase 07 M1)', () => {
  it('records opened/updated/proposed events and exposes batched activity counts', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-engagement-'));
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
      const user = await call('POST', '/api/users', { name: 'Tracer' }, tokenRoot.token);
      const token = createApiToken(dir, 'tracer', 'rw', user.json.user.id);

      const created = await call('POST', '/api/items', {
        type: 'raw.document', title: 'Trace me', domain: 'knowledge', origin: 'user',
        fields: { content_text: 'x' },
      }, token.token);
      const itemId = created.json.item.id;

      // 'opened' recorded once (throttled within 10 min)
      await call('GET', `/api/items/${itemId}`, undefined, token.token);
      await call('GET', `/api/items/${itemId}`, undefined, token.token);
      let detail = await call('GET', `/api/items/${itemId}`, undefined, token.token);
      const opened = detail.json.events.filter((e: { action: string }) => e.action === 'opened');
      expect(opened).toHaveLength(1);
      expect(opened[0].actor).toBe('user');

      // 'updated' with changed keys detail
      await call('PATCH', `/api/items/${itemId}`, { title: 'Traced', fields: { content_text: 'y' } }, token.token);
      detail = await call('GET', `/api/items/${itemId}`, undefined, token.token);
      const updated = detail.json.events.find((e: { action: string }) => e.action === 'updated');
      expect(updated).toBeTruthy();
      expect(updated.detail).toContain('title');
      expect(updated.detail).toContain('fields.content_text');

      // 'proposed' from machine → actor=agent
      const prop = await call('POST', '/api/proposals', {
        kind: 'semantic_name', target_id: itemId, proposed_value: 'Traceable doc', source: 'agent',
      }, token.token);
      expect(prop.status).toBe(201);
      detail = await call('GET', `/api/items/${itemId}`, undefined, token.token);
      const proposed = detail.json.events.find((e: { action: string }) => e.action === 'proposed');
      expect(proposed).toBeTruthy();
      expect(proposed.actor).toBe('agent');

      // batched activity map on list: created + opened + updated = 3 user events
      const list = await call('GET', '/api/items', undefined, token.token);
      expect(list.json.activity).toBeTruthy();
      expect(list.json.activity[itemId].user).toBe(3); // created + opened + updated
      expect(list.json.activity[itemId].agent).toBe(1); // proposed
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
