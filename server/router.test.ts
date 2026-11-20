import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readConfig } from './config.ts';
import { createApiRouter } from './router.ts';
import { createDatabase, type DatabaseHandle } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';

type FakeRes = {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  setHeader: (name: string, value: string) => void;
  end: (chunk?: string) => void;
};

function fakeRes(): FakeRes {
  const headers: Record<string, string> = {};
  const res: FakeRes = {
    statusCode: 200,
    body: '',
    headers,
    setHeader(name, value) { headers[name] = String(value); },
    end(chunk) { res.body = chunk ?? ''; },
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

let handle: DatabaseHandle;
let router: ReturnType<typeof createApiRouter>;

beforeEach(async () => {
  handle = createDatabase();
  await handle.exec(migrationSql());
  router = createApiRouter(readConfig({}), handle.db);
});

async function call(method: string, url: string, body?: unknown) {
  const res = fakeRes();
  const next = () => { throw new Error('next called'); };
  await router(fakeReq(method, url, body), res as unknown as ServerResponse, next);
  return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
}

describe('API routes', () => {
  it('creates and lists items', async () => {
    const created = await call('POST', '/api/items', {
      type: 'object.concept',
      title: 'Context',
      domain: 'knowledge',
      origin: 'user',
      fields: { definition: 'A view' },
    });
    expect(created.status).toBe(201);
    expect(created.json.item.title).toBe('Context');
    const list = await call('GET', '/api/items?type=object.concept');
    expect(list.status).toBe(200);
    expect(list.json.items).toHaveLength(1);
  });

  it('returns contract error for invalid body', async () => {
    const result = await call('POST', '/api/items', { type: 'object.concept', title: '' });
    expect(result.status).toBe(400);
    expect(result.json).toMatchObject({ ok: false, kind: 'contract' });
  });

  it('returns not_found for missing item', async () => {
    const result = await call('GET', '/api/items/obj_missing');
    expect(result.status).toBe(404);
    expect(result.json.kind).toBe('not_found');
  });

  it('deletes an item and cascades its relations and events', async () => {
    const raw = await call('POST', '/api/items', {
      type: 'raw.document',
      title: 'Paper',
      domain: 'knowledge',
      origin: 'user',
      fields: { content_text: 'text' },
    });
    const obj = await call('POST', '/api/items', {
      type: 'object.concept',
      title: 'Concept',
      domain: 'knowledge',
      origin: 'user',
      fields: { definition: 'def' },
    });
    await call('POST', '/api/relations', {
      kind: 'derived_from',
      from_id: obj.json.item.id,
      to_id: raw.json.item.id,
    });

    const deleted = await call('DELETE', `/api/items/${raw.json.item.id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.json.deleted).toBe(true);

    const gone = await call('GET', `/api/items/${raw.json.item.id}`);
    expect(gone.status).toBe(404);
    const survivor = await call('GET', `/api/items/${obj.json.item.id}`);
    expect(survivor.json.relations.outgoing).toHaveLength(0);

    const again = await call('DELETE', `/api/items/${raw.json.item.id}`);
    expect(again.status).toBe(404);
  });

  it('manages clusters and multi-homed members', async () => {
    const a = await call('POST', '/api/items', {
      type: 'raw.document', title: 'Chunk A', domain: 'knowledge', origin: 'user',
      fields: { content_text: 'a' },
    });
    const b = await call('POST', '/api/items', {
      type: 'raw.document', title: 'Chunk B', domain: 'knowledge', origin: 'user',
      fields: { content_text: 'b' },
    });
    const c1 = await call('POST', '/api/clusters', { title: 'Research', description: 'first' });
    const c2 = await call('POST', '/api/clusters', { title: 'Project' });
    expect(c1.status).toBe(201);

    const add = await call('POST', `/api/clusters/${c1.json.cluster.id}/members`, { item_id: a.json.item.id });
    expect(add.status).toBe(201);
    expect(add.json.cluster.member_ids).toEqual([a.json.item.id]);
    const dup = await call('POST', `/api/clusters/${c1.json.cluster.id}/members`, { item_id: a.json.item.id });
    expect(dup.status).toBe(409);
    await call('POST', `/api/clusters/${c2.json.cluster.id}/members`, { item_id: a.json.item.id });
    const multi = await call('GET', `/api/clusters/${c2.json.cluster.id}`);
    expect(multi.json.cluster.member_ids).toEqual([a.json.item.id]);

    const upd = await call('PATCH', `/api/clusters/${c1.json.cluster.id}`, { title: 'Research 2026' });
    expect(upd.json.cluster.title).toBe('Research 2026');

    const removed = await call('DELETE', `/api/clusters/${c1.json.cluster.id}/members`, { item_id: a.json.item.id });
    expect(removed.json.cluster.member_ids).toEqual([]);

    const gone = await call('DELETE', `/api/clusters/${c2.json.cluster.id}`);
    expect(gone.json.deleted).toBe(true);
    const missing = await call('GET', `/api/clusters/${c2.json.cluster.id}`);
    expect(missing.status).toBe(404);
    void b;
  });

  it('runs the proposal lifecycle', async () => {
    const item = await call('POST', '/api/items', {
      type: 'object.concept', title: 'Old name', domain: 'knowledge', origin: 'user',
      fields: { definition: 'def' },
    });
    const proposal = await call('POST', '/api/proposals', {
      kind: 'semantic_name',
      target_id: item.json.item.id,
      proposed_value: 'Better semantic name',
      rationale: 'clearer',
      source: 'agent',
    });
    expect(proposal.status).toBe(201);
    expect(proposal.json.proposal.status).toBe('pending');

    const pending = await call('GET', '/api/proposals?status=pending');
    expect(pending.json.proposals).toHaveLength(1);
    const resolved = await call('POST', `/api/proposals/${proposal.json.proposal.id}/resolve`, { status: 'accepted' });
    expect(resolved.json.proposal.status).toBe('accepted');
    expect(resolved.json.proposal.resolved_at).not.toBe('');
    const after = await call('GET', '/api/proposals?status=pending');
    expect(after.json.proposals).toHaveLength(0);
  });

  it('ingests a URL as preview only', async () => {
    const http = await import('node:http');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<html><head><title>Sample Page</title><style>.x{color:red}</style></head><body><h1>Heading</h1><p>Body text with a <a href="#">link</a>.</p><script>evil()</script></body></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;
    try {
      const result = await call('POST', '/api/ingest/url', { url: `http://127.0.0.1:${port}/page` });
      expect(result.status).toBe(200);
      expect(result.json.title).toBe('Sample Page');
      expect(result.json.text).toContain('Heading');
      expect(result.json.text).toContain('Body text with a link.');
      expect(result.json.text).not.toContain('evil');
      expect(result.json.text).not.toContain('color:red');

      const items = await call('GET', '/api/items');
      const before = items.json.items.length;
      await call('POST', '/api/ingest/url', { url: `http://127.0.0.1:${port}/again` });
      const afterList = await call('GET', '/api/items');
      expect(afterList.json.items.length).toBe(before); // preview only, nothing persisted

      const bad = await call('POST', '/api/ingest/url', { url: 'ftp://nope' });
      expect(bad.status).toBe(400);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('creates a context, adds members and returns context detail', async () => {
    const raw = await call('POST', '/api/items', {
      type: 'raw.document', title: 'Source', domain: 'knowledge', origin: 'user',
      fields: { content_text: 'Text' },
    });
    const created = await call('POST', '/api/contexts', {
      title: 'Knowledge Context', subject: 'Design', scope: 'MVP', purpose: 'Inspect',
    });
    expect(created.status).toBe(201);
    const id = created.json.context.id;
    const added = await call('POST', `/api/contexts/${id}/members`, { item_id: raw.json.item.id });
    expect(added.status).toBe(201);
    const detail = await call('GET', `/api/contexts/${id}`);
    expect(detail.json.context.member_ids).toEqual([raw.json.item.id]);
    const duplicate = await call('POST', `/api/contexts/${id}/members`, { item_id: raw.json.item.id });
    expect(duplicate.status).toBe(409);
    const removed = await call('DELETE', `/api/contexts/${id}/members`, { item_id: raw.json.item.id });
    expect(removed.status).toBe(200);
    expect((await call('GET', `/api/contexts/${id}`)).json.context.member_ids).toEqual([]);
  });

  it('assembles detail with provenance and history', async () => {
    const raw = await call('POST', '/api/items', {
      type: 'raw.document', title: 'Paper', domain: 'knowledge', origin: 'import',
      fields: { content_text: 'Original' },
    });
    const concept = await call('POST', '/api/items', {
      type: 'object.hypothesis', title: 'Claim', domain: 'knowledge', origin: 'agent',
      fields: { claim: 'Testable claim' },
    });
    const linked = await call('POST', '/api/relations', {
      kind: 'derived_from', from_id: concept.json.item.id, to_id: raw.json.item.id,
    });
    expect(linked.status).toBe(201);
    const detail = await call('GET', `/api/items/${concept.json.item.id}`);
    expect(detail.json.relations.outgoing).toHaveLength(1);
    expect(detail.json.events.some((e: { action: string }) => e.action === 'created')).toBe(true);
  });
});
