import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readConfig } from './config.ts';
import { createApiRouter } from './router.ts';
import { createDatabase } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';

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

function fakeReq(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  const req = Readable.from([payload]) as IncomingMessage;
  req.method = method;
  req.url = url;
  req.headers = headers;
  return req;
}

describe('phase 02 hardening (idempotency, integrity)', () => {
  it('replays idempotent writes instead of creating duplicates', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-idem-'));
    try {
      const handle = createDatabase();
      await handle.exec(migrationSql());
      const router = createApiRouter(readConfig({ PGLITE_DIR: path.join(dir, 'pglite') }), handle.db);
      const call = async (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body, headers) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}'), headers: res.headers };
      };

      const payload = {
        type: 'raw.document', title: 'idempotent chunk', domain: 'knowledge', origin: 'user',
        fields: { content_text: 'stable content' },
      };
      const first = await call('POST', '/api/items', payload, { 'idempotency-key': 'key-1' });
      expect(first.status).toBe(201);
      expect(first.headers['x-request-id']).toBeTruthy(); // request correlation

      const replay = await call('POST', '/api/items', payload, { 'idempotency-key': 'key-1' });
      expect(replay.status).toBe(201);
      expect(replay.json.item.id).toBe(first.json.item.id); // same object, not a duplicate

      const mismatch = await call('POST', '/api/items', { ...payload, title: 'different' }, { 'idempotency-key': 'key-1' });
      expect(mismatch.status).toBe(409);
      expect(mismatch.json.kind).toBe('conflict');

      const list = await call('GET', '/api/items');
      expect(list.json.items.filter((i: { title: string }) => i.title === 'idempotent chunk')).toHaveLength(1);

      // Without the header, behavior is unchanged (two distinct items)
      const a = await call('POST', '/api/items', payload);
      const b = await call('POST', '/api/items', payload);
      expect(a.json.item.id).not.toBe(b.json.item.id);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects duplicate tag assignments with 409 (0007 unique index)', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-tagdup-'));
    try {
      const handle = createDatabase();
      await handle.exec(migrationSql());
      const router = createApiRouter(readConfig({ PGLITE_DIR: path.join(dir, 'pglite') }), handle.db);
      const call = async (method: string, url: string, body?: unknown) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };

      const item = await call('POST', '/api/items', {
        type: 'raw.document', title: 'tagged', domain: 'knowledge', origin: 'user', fields: { content_text: 'x' },
      });
      const tag = { definition_id: 'tag_expertise', item_id: item.json.item.id, value: 'AI Architecture', scope: 'global' };
      expect((await call('POST', '/api/tags/values', tag)).status).toBe(201);
      const dup = await call('POST', '/api/tags/values', tag);
      expect(dup.status).toBe(409);
      expect(dup.json.kind).toBe('conflict');

      // A different scope for the same value is a distinct assignment
      expect((await call('POST', '/api/tags/values', { ...tag, scope: 'project:gsc' })).status).toBe(201);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('settings ui llm config', () => {
  it('stores the api key encrypted, never echoes it, and resolves at runtime', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-llmcfg-'));
    try {
      const handle = createDatabase();
      await handle.exec(migrationSql());
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite') });
      const router = createApiRouter(config, handle.db);
      const call = async (method: string, url: string, body?: unknown) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };

      const initial = await call('GET', '/api/llm/config');
      expect(initial.status).toBe(200);
      expect(initial.json.config.key_set).toBe(false);

      const saved = await call('PATCH', '/api/llm/config', {
        base_url: 'https://api.xiaomimimo.com/v1',
        model: 'mimo-v2.6-flash',
        api_key: 'super-secret-key-123456',
      });
      expect(saved.status).toBe(200);
      expect(saved.json.config.key_set).toBe(true);
      expect(saved.json.config.key_hint).toBe('supe…3456');
      expect(JSON.stringify(saved.json)).not.toContain('super-secret-key-123456'); // never echoed

      // key is encrypted on disk
      const raw = readFileSync(path.join(dir, 'secrets.json'), 'utf8');
      expect(raw).not.toContain('super-secret-key-123456');
      expect(raw).toContain('enc:v1:');

      // keyless probe request is refused before any network call
      const noKeyDir = mkdtempSync(path.join(tmpdir(), 'gsc-llmnok-'));
      try {
        const h2 = createDatabase();
        await h2.exec(migrationSql());
        const r2 = createApiRouter(readConfig({ PGLITE_DIR: path.join(noKeyDir, 'pglite') }), h2.db);
        const res2 = fakeRes();
        await r2(fakeReq('POST', '/api/llm/check') as IncomingMessage, res2 as unknown as ServerResponse, () => {});
        expect(res2.statusCode).toBe(400);
        expect(JSON.parse(res2.body).message).toMatch(/API key/);
      } finally {
        rmSync(noKeyDir, { recursive: true, force: true });
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
