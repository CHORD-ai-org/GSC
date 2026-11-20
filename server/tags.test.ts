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

function fakeReq(method: string, url: string, body?: unknown): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  const req = Readable.from([payload]) as IncomingMessage;
  req.method = method;
  req.url = url;
  return req;
}

describe('meta tags (PLAN-8)', () => {
  it('seeds six dimensions, refuses unknown definitions, scopes values, and outputs only confirmed profile entries', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-tags-'));
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

      // A8-1: the six Vision §5.4 dimensions are pre-seeded (D-064)
      const defs = await call('GET', '/api/tags/definitions');
      expect(defs.status).toBe(200);
      expect(defs.json.definitions.length).toBe(6);
      const names = defs.json.definitions.map((d: { name: string }) => d.name);
      expect(names).toContain('Thinking Style');
      expect(names).toContain('User Profile');

      // Controlled definitions: unknown dimension cannot be assigned
      const bad = await call('POST', '/api/tags/values', {
        definition_id: 'tag_nonexistent', value: 'x',
      });
      expect(bad.status).toBe(400);
      expect(bad.json.kind).toBe('contract');

      // A custom definition can be created and then assigned
      const custom = await call('POST', '/api/tags/definitions', { name: 'Writing Tone' });
      expect(custom.status).toBe(201);
      const customValue = await call('POST', '/api/tags/values', {
        definition_id: custom.json.definition.id, value: 'terse',
      });
      expect(customValue.status).toBe(201);

      // B8-1: values carry a scope; invalid scope is rejected
      const badScope = await call('POST', '/api/tags/values', {
        definition_id: 'tag_thinking_style', value: 'x', scope: 'bogus',
      });
      expect(badScope.status).toBe(400);
      const scoped = await call('POST', '/api/tags/values', {
        definition_id: 'tag_thinking_style', value: 'counterexample-first',
        scope: 'project:gsc',
      });
      expect(scoped.status).toBe(201);
      expect(scoped.json.value.scope).toBe('project:gsc');

      // B8-2: profile output returns only confirmed User Profile values
      const unconfirmed = await call('POST', '/api/tags/values', {
        definition_id: 'tag_user_profile', value: 'Prefers terse output', confirmed: false,
      });
      const confirmed = await call('POST', '/api/tags/values', {
        definition_id: 'tag_user_profile', value: 'Works on GSC', confirmed: true,
      });
      expect(confirmed.json.value.confirmed).toBe(true);
      // unconfirmed → confirm via PATCH (human governance)
      const flip = await call('PATCH', `/api/tags/values/${unconfirmed.json.value.id}`, { confirmed: true });
      expect(flip.status).toBe(200);

      const before = await call('GET', '/api/profile');
      expect(before.json.profile.map((p: { value: string }) => p.value).sort()).toEqual(
        ['Prefers terse output', 'Works on GSC'].sort(),
      );

      // Remove one → it leaves the profile output
      await call('DELETE', `/api/tags/values/${unconfirmed.json.value.id}`);
      const after = await call('GET', '/api/profile');
      expect(after.json.profile).toEqual([{ value: 'Works on GSC', scope: 'global' }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
