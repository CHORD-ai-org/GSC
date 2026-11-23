/* V5 scenario A data prep: import the 20 local materials as file sources and sync.
   Usage: node scripts/v5-ingest-a.mjs [apiBase] */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const API = process.argv[2] || 'http://127.0.0.1:8788';
const DIR = path.resolve('data/v5-scenario-a');

const files = readdirSync(DIR).filter((f) => f.endsWith('.txt')).sort();
const created = [];
for (const f of files) {
  const text = readFileSync(path.join(DIR, f), 'utf-8');
  const title = text.split('\n')[0].trim();
  const src = await fetch(`${API}/api/sources`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'file', label: title, scope: text }),
  }).then((r) => r.json());
  if (!src.ok) { console.log('CREATE FAIL', f, JSON.stringify(src).slice(0, 120)); continue; }
  const sync = await fetch(`${API}/api/sources/${src.source.id}/sync`, { method: 'POST' }).then((r) => r.json());
  created.push({ file: f, source_id: src.source.id, sync: sync.result ?? sync });
}
console.log(JSON.stringify({ ingested: created.length, detail: created.map((c) => ({ file: c.file, created: c.sync.created ?? 0 })) }, null, 0));
