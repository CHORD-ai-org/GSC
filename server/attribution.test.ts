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
import { computeAttribution } from '../src/lib/events.ts';
import type { EventDTO } from '../src/lib/events.ts';

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

function ev(partial: Partial<EventDTO>): EventDTO {
  return {
    id: 'e', item_id: 'i', at: '2026-01-01T00:00:00.000Z', actor: 'user', action: 'updated', detail: '', ...partial,
  };
}

describe('V3 attribution (Phase 07 M3)', () => {
  it('computeAttribution counts edits and tracks field ownership (oldest→newest wins)', () => {
    const events = [
      ev({ id: '1', at: '2026-01-03T00:00:00.000Z', actor: 'agent', detail: 'fields.claim | via proposal p1' }),
      ev({ id: '2', at: '2026-01-02T00:00:00.000Z', actor: 'user', detail: 'fields.claim, fields.notes' }),
      ev({ id: '3', at: '2026-01-01T00:00:00.000Z', actor: 'user', action: 'created', detail: 'fields.junk' }),
    ];
    const out = computeAttribution(events);
    expect(out.user_edits).toBe(1);
    expect(out.agent_edits).toBe(1);
    expect(out.field_owners['fields.claim']).toBe('agent'); // later edit wins
    expect(out.field_owners['fields.notes']).toBe('user');
    expect(out.field_owners['fields.junk']).toBeUndefined(); // non-edit actions ignored
  });

  it('accepted proposals apply as agent-originated changes with via-proposal trace', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-v3attr-'));
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
      const user = await call('POST', '/api/users', { name: 'A' }, tokenRoot.token);
      const token = createApiToken(dir, 'a', 'rw', user.json.user.id);

      const item = await call('POST', '/api/items', {
        type: 'object.concept', title: 'Old name', domain: 'knowledge', origin: 'user', fields: { definition: 'd' },
      }, token.token);
      const itemId = item.json.item.id;
      const item2 = await call('POST', '/api/items', {
        type: 'object.concept', title: 'Peer', domain: 'knowledge', origin: 'user', fields: { definition: 'd' },
      }, token.token);
      const item2Id = item2.json.item.id;

      // user edit first
      await call('PATCH', `/api/items/${itemId}`, { fields: { definition: 'd2' } }, token.token);

      // semantic_name proposal accepted → title change attributed to agent with via flag
      const p1 = await call('POST', '/api/proposals', {
        kind: 'semantic_name', target_id: itemId, proposed_value: 'New name', source: 'detector',
      }, token.token);
      expect((await call('POST', `/api/proposals/${p1.json.proposal.id}/resolve`, { status: 'accepted' }, token.token)).status).toBe(200);

      // association proposal accepted → relation created_by agent
      const p2 = await call('POST', '/api/proposals', {
        kind: 'association', target_id: itemId, related_id: item2Id, proposed_value: item2Id, source: 'agent',
      }, token.token);
      expect((await call('POST', `/api/proposals/${p2.json.proposal.id}/resolve`, { status: 'accepted' }, token.token)).status).toBe(200);

      const detail = await call('GET', `/api/items/${itemId}`, undefined, token.token);
      const agentVia = detail.json.events.find((e: { actor: string; detail: string }) => e.actor === 'agent' && e.detail.includes('via proposal'));
      expect(agentVia).toBeTruthy();
      const rel = detail.json.relations.outgoing.find((r: { kind: string }) => r.kind === 'related_to');
      expect(rel).toBeTruthy();
      expect(rel.created_by).toBe('agent');

      // detail response attribution reflects the mix
      expect(detail.json.attribution.agent_edits).toBeGreaterThanOrEqual(1);
      expect(detail.json.attribution.user_edits).toBeGreaterThanOrEqual(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
