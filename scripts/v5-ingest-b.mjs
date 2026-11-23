/* V5 scenario B data prep: enqueue 10 URL capture tasks and poll until imported.
   Usage: node scripts/v5-ingest-b.mjs [apiBase] */
const API = process.argv[2] || 'http://127.0.0.1:8788';

const URLS = [
  'https://arxiv.org/abs/1706.03762',
  'https://arxiv.org/abs/1810.04805',
  'https://arxiv.org/abs/1409.0575',
  'https://arxiv.org/abs/1512.03385',
  'https://arxiv.org/abs/2005.14165',
  'https://arxiv.org/abs/1412.6980',
  'https://arxiv.org/abs/1502.03167',
  'https://arxiv.org/abs/1607.06450',
  'https://arxiv.org/abs/1707.06347',
  'https://arxiv.org/abs/1806.00089',
];

const tasks = [];
for (const url of URLS) {
  const r = await fetch(`${API}/api/capture`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'web', url }),
  }).then((x) => x.json());
  if (!r.ok) console.log('ENQUEUE FAIL', url, JSON.stringify(r).slice(0, 100));
  else tasks.push(r.task?.id ?? r.capture?.id ?? '?');
}
console.log('enqueued:', tasks.length);

let done = 0;
for (let i = 0; i < 60; i += 1) {
  await new Promise((r) => setTimeout(r, 3000));
  const list = await fetch(`${API}/api/capture`).then((x) => x.json());
  const rows = (list.tasks ?? list.captures ?? []).filter((t) => tasks.includes(t.id));
  done = rows.filter((t) => t.status === 'completed' || t.status === 'failed').length;
  console.log(`poll ${i}: ${done}/${tasks.length} settled`);
  if (done >= tasks.length) break;
}
const list = await fetch(`${API}/api/capture`).then((x) => x.json());
const rows = (list.tasks ?? list.captures ?? []).filter((t) => tasks.includes(t.id));
console.log(JSON.stringify(rows.map((t) => ({ id: t.id.slice(0, 10), status: t.status, error: (t.last_error ?? '').slice(0, 40) }))));
