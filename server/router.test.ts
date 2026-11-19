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
