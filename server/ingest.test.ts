import { describe, expect, it, vi } from 'vitest';
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
import { resolveProposalApplying } from './repo/proposals.ts';
import { listClusters } from './repo/clusters.ts';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
}));

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

async function fresh(): Promise<{ handle: DatabaseHandle; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'gsc-ingest-'));
  const handle = createDatabase();
  await handle.exec(migrationSql());
  return { handle, dir };
}

describe('G2 batch intake (/api/ingest/batch)', () => {
  it('groups by client×project, is snapshot-idempotent, and proposes blocks', async () => {
    const { handle, dir } = await fresh();
    try {
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

      const batch = {
        group: { client: 'workbuddy', project: 'GSC', session_id: 't-1' },
        docs: [
          { title: 'note one', content_text: 'first excerpt about the capture loop' },
          { title: 'note two', content_text: 'second excerpt about block assignment' },
        ],
      };

      // contract guards
      expect((await call('POST', '/api/ingest/batch', { group: { client: 'nope', project: 'p', session_id: 's' }, docs: [{ content_text: 'x' }] }, token.token)).status).toBe(400);
      expect((await call('POST', '/api/ingest/batch', { group: { client: 'codex', project: 'p', session_id: 's' }, docs: [] }, token.token)).status).toBe(400);

      const first = await call('POST', '/api/ingest/batch', batch, token.token);
      expect(first.status).toBe(201);
      expect(first.json.imported).toBe(2);
      expect(first.json.skipped).toBe(0);
      expect(first.json.source_id).toMatch(/^src_/);

      // same batch again → idempotent
      const second = await call('POST', '/api/ingest/batch', batch, token.token);
      expect(second.json.imported).toBe(0);
      expect(second.json.skipped).toBe(2);
      expect(second.json.source_id).toBe(first.json.source_id); // same group → same anchor

      // group anchor visible as an agent source
      const sources = await call('GET', '/api/sources', undefined, token.token);
      const anchor = sources.json.sources.find((s: { label: string }) => s.label === 'agent:workbuddy:GSC');
      expect(anchor?.kind).toBe('agent');

      // proposals are best-effort (LLM unconfigured here → 0 is correct);
      // the generation path itself is covered by the organizer unit below
      const props = await call('GET', '/api/proposals?status=pending', undefined, token.token);
      expect(Array.isArray(props.json.proposals)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('proposeBlockAssignment parses the LLM reply into assignments', async () => {
    const config = readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'test-key' });
    const { proposeBlockAssignment } = await import('./agent/organizer.ts');
    const fakeFetch = async () => new Response(JSON.stringify({
      choices: [{ message: { content: '{"assignments":[{"item":"i1","cluster":"插件开发","why":"topic fit"},{"item":"i2","cluster":"实验记录","why":"lab notes"}]}' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    const out = await proposeBlockAssignment(
      config,
      [{ id: 'i1', title: 'a', content: 'x' }, { id: 'i2', title: 'b', content: 'y' }],
      ['插件开发'],
      fakeFetch as unknown as typeof fetch,
    );
    expect(out).toEqual([
      { item_id: 'i1', cluster_name: '插件开发', rationale: 'topic fit' },
      { item_id: 'i2', cluster_name: '实验记录', rationale: 'lab notes' },
    ]);
  });

  it('cluster proposal accept joins an existing same-title cluster (merge semantics)', async () => {
    const { handle, dir } = await fresh();
    try {
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite') });
      const { createItem } = await import('./repo/items.ts');
      const { createCluster, addClusterMember } = await import('./repo/clusters.ts');
      const { createProposal } = await import('./repo/proposals.ts');

      const a = await createItem(handle.db, { type: 'raw.document', title: 'A', domain: 'knowledge', origin: 'user', fields: { content_text: 'a' } });
      const b = await createItem(handle.db, { type: 'raw.document', title: 'B', domain: 'knowledge', origin: 'user', fields: { content_text: 'b' } });
      const existing = await createCluster(handle.db, { title: '插件开发', description: 'seed' });
      await addClusterMember(handle.db, existing.id, a.id);

      const p = await createProposal(handle.db, {
        kind: 'cluster', target_id: b.id, proposed_value: '插件开发', rationale: 'same block', source: 'agent',
      });
      const resolved = await resolveProposalApplying(handle.db, p.id, 'accepted');
      expect(resolved?.status).toBe('accepted');

      const clusters = await listClusters(handle.db);
      const sameTitle = clusters.filter((c) => c.title === '插件开发');
      expect(sameTitle).toHaveLength(1); // merged, not duplicated
      expect([...sameTitle[0].member_ids].sort()).toEqual([a.id, b.id].sort());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
