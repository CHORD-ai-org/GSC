const base = process.env.GSC_API_URL ?? 'http://127.0.0.1:8788';

async function json(path, init) {
  const res = await fetch(base + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json();
  return { status: res.status, body };
}

const raw = await json('/api/items', {
  method: 'POST',
  body: JSON.stringify({
    type: 'raw.document',
    title: `Smoke source ${Date.now()}`,
    domain: 'knowledge',
    origin: 'import',
    source_label: 'api-check',
    fields: { content_text: 'Original smoke text', author: 'gsc-check' },
  }),
});
if (raw.status !== 201 || !raw.body.item?.id) throw new Error('create raw failed');

const concept = await json('/api/items', {
  method: 'POST',
  body: JSON.stringify({
    type: 'object.concept',
    title: `Smoke concept ${Date.now()}`,
    domain: 'knowledge',
    origin: 'agent',
    fields: { definition: 'A smoke-tested concept' },
  }),
});
if (concept.status !== 201 || !concept.body.item?.id) throw new Error('create concept failed');

const relation = await json('/api/relations', {
  method: 'POST',
  body: JSON.stringify({
    kind: 'derived_from',
    from_id: concept.body.item.id,
    to_id: raw.body.item.id,
    note: 'smoke link',
  }),
});
if (relation.status !== 201) throw new Error('create relation failed');

const detail = await json(`/api/items/${concept.body.item.id}`);
if (detail.status !== 200 || detail.body.relations?.outgoing?.length !== 1) {
  throw new Error('detail assembly failed');
}

const list = await json('/api/items?domain=knowledge');
if (list.status !== 200 || !Array.isArray(list.body.items)) throw new Error('list failed');

const context = await json('/api/contexts', {
  method: 'POST',
  body: JSON.stringify({
    title: `Smoke Context ${Date.now()}`,
    subject: 'Context infrastructure',
    scope: 'MVP smoke test',
    purpose: 'Verify explicit membership',
  }),
});
if (context.status !== 201 || !context.body.context?.id) throw new Error('create context failed');
const contextId = context.body.context.id;

const member = await json(`/api/contexts/${contextId}/members`, {
  method: 'POST',
  body: JSON.stringify({ item_id: concept.body.item.id }),
});
if (member.status !== 201) throw new Error('add member failed');
const contextDetail = await json(`/api/contexts/${contextId}`);
if (contextDetail.body.context?.member_ids?.[0] !== concept.body.item.id) {
  throw new Error('context detail failed');
}
await json(`/api/contexts/${contextId}/members`, {
  method: 'DELETE',
  body: JSON.stringify({ item_id: concept.body.item.id }),
});

const invalid = await json('/api/items', {
  method: 'POST',
  body: JSON.stringify({ type: 'object.concept', title: '' }),
});
if (invalid.status !== 400 || invalid.body.kind !== 'contract') throw new Error('error contract failed');

process.stdout.write('[gsc-api-check] 10 checks passed\n');
