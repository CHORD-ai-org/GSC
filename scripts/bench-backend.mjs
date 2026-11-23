// DB-3 + SRE-2 — backend performance baseline (BACKEND_OPTIMIZATION_PLAN batch B).
// Boots the real router over HTTP against a fresh PGlite database, seeds a
// dataset, then measures read/write workloads and captures EXPLAIN
// (ANALYZE, BUFFERS) for the key query shapes. Writes
// docs/BACKEND_PERF_BASELINE.md. Zero new dependencies.
//
// Note: PGlite is embedded Postgres (WASM) — these numbers are the app-level
// baseline. Re-run against the postgres adapter (GSC_PG_DSN) for deployment
// numbers once DB-1 acceptance lands.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { readConfig } from '../server/config.ts';
import { createDatabase } from '../server/persistence/client.ts';
import { applyPendingMigrations } from '../server/persistence/migrate.ts';
import { createApiRouter } from '../server/router.ts';
import { createItem } from '../server/repo/items.ts';
import { createRelation } from '../server/repo/relations.ts';
import { addContextMember, createContext } from '../server/repo/contexts.ts';

const ITEM_COUNT = Number(process.env.BENCH_ITEMS ?? 1000);
const CONTEXT_COUNT = 40;
const RELATION_COUNT = 300;

let base = '';
const dir = mkdtempSync(path.join(tmpdir(), 'gsc-bench-'));
const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite') });
const handle = createDatabase({ dataDir: path.join(dir, 'pglite') });

function pct(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function bench(name, makeInit, { total = 200, concurrency = 8, warmup = 16 } = {}) {
  for (let i = 0; i < warmup; i += 1) {
    const res = await fetch(base + name.path, makeInit(i));
    await res.arrayBuffer();
    if (!res.ok) throw new Error(`warmup ${name.label}: HTTP ${res.status}`);
  }
  const durations = [];
  const started = performance.now();
  let issued = 0;
  async function worker() {
    while (issued < total) {
      issued += 1;
      const t0 = performance.now();
      const res = await fetch(base + name.path, makeInit(issued));
      await res.arrayBuffer();
      if (!res.ok) throw new Error(`${name.label}: HTTP ${res.status}`);
      durations.push(performance.now() - t0);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const wall = performance.now() - started;
  durations.sort((a, b) => a - b);
  return {
    label: name.label,
    total,
    concurrency,
    p50: pct(durations, 50),
    p95: pct(durations, 95),
    p99: pct(durations, 99),
    tps: (total / wall) * 1000,
  };
}

const server = createServer((req, res) => {
  void createApiRouter(config, handle.db)(req, res, () => {
    res.statusCode = 404;
    res.end();
  });
});

try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  process.stdout.write(`[bench] base ${base}\n[bench] seeding ${ITEM_COUNT} items…\n`);

  const t0 = performance.now();
  await applyPendingMigrations(handle);
  const itemIds = [];
  for (let i = 0; i < ITEM_COUNT; i += 1) {
    const item = await createItem(handle.db, {
      type: 'raw.document',
      title: `Bench seed ${i} — chunking beats long context`,
      domain: 'knowledge',
      origin: 'import',
      source_label: 'bench',
      fields: { content_text: `bench body ${i} `.repeat(10), author: 'bench' },
    });
    itemIds.push(item.id);
  }
  for (let i = 0; i < CONTEXT_COUNT; i += 1) {
    const ctx = await createContext(handle.db, { title: `Bench context ${i}`, subject: 'bench', scope: 'global', purpose: 'baseline' });
    for (let m = 0; m < 10; m += 1) {
      await addContextMember(handle.db, ctx.id, itemIds[(i * 10 + m) % ITEM_COUNT]);
    }
  }
  for (let i = 0; i < RELATION_COUNT; i += 1) {
    await createRelation(handle.db, { kind: 'references', from_id: itemIds[i % ITEM_COUNT], to_id: itemIds[(i * 7 + 1) % ITEM_COUNT], note: 'bench' });
  }
  process.stdout.write(`[bench] seeded in ${((performance.now() - t0) / 1000).toFixed(1)}s\n[bench] running workloads…\n`);

  const sampleId = itemIds[Math.floor(ITEM_COUNT / 2)];
  const results = [];
  results.push(await bench({ label: 'list items (page 200)', path: '/api/items?limit=200' }, () => undefined));
  results.push(await bench({ label: 'list items (keyword filter)', path: '/api/items?limit=200&q=chunking' }, () => undefined));
  results.push(await bench({ label: 'item detail', path: `/api/items/${sampleId}` }, () => undefined));
  // writes stay inside the O1-5 token bucket (60/min capacity) — the rate
  // policy IS the standing write-throughput limit; latency is what we measure.
  results.push(await bench({ label: 'create item (write, rate-limited 60/min)', path: '/api/items' }, (i) => ({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'raw.document', title: `Bench write ${i}`, domain: 'knowledge', origin: 'user',
      fields: { content_text: `bench write body ${i}` },
    }),
  }), { total: 40, warmup: 10 }));
  results.push(await bench({ label: 'list contexts (with members)', path: '/api/contexts' }, () => undefined));
  results.push(await bench({ label: 'search', path: '/api/search?q=chunking' }, () => undefined));
  results.push(await bench({ label: 'relations projection (50 ids)', path: `/api/relations?item_ids=${itemIds.slice(0, 50).join(',')}` }, () => undefined));

  const explainQueries = [
    ['items page: keyset order (matches items_updated_id_idx)', `EXPLAIN (ANALYZE, BUFFERS) SELECT id, type, title FROM items WHERE deleted_at IS NULL ORDER BY updated_at DESC, id DESC LIMIT 200`],
    ['items page with type filter', `EXPLAIN (ANALYZE, BUFFERS) SELECT id, title FROM items WHERE deleted_at IS NULL AND type = 'raw.document' ORDER BY updated_at DESC, id DESC LIMIT 200`],
    ['activity counts aggregate (V1, rides on the list endpoint)', `EXPLAIN (ANALYZE, BUFFERS) SELECT item_id, actor, count(*) FROM events WHERE item_id IN (SELECT id FROM items WHERE deleted_at IS NULL) GROUP BY item_id, actor`],
    ['detail join content by id', `EXPLAIN (ANALYZE, BUFFERS) SELECT i.id, i.title, c.content_text FROM items i LEFT JOIN item_content c ON c.item_id = i.id WHERE i.id = '${sampleId}'`],
    ['relations by endpoint', `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM relations WHERE from_id = '${sampleId}' OR to_id = '${sampleId}'`],
    ['events by item', `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM events WHERE item_id = '${sampleId}' ORDER BY at DESC LIMIT 50`],
    ['context members (batch)', `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM context_members WHERE context_id IN (SELECT id FROM contexts ORDER BY created_at LIMIT 10)`],
    ['keyword search title+content', `EXPLAIN (ANALYZE, BUFFERS) SELECT i.id, i.title FROM items i LEFT JOIN item_content c ON c.item_id = i.id WHERE i.deleted_at IS NULL AND (i.title ILIKE '%chunking%' OR c.content_text ILIKE '%chunking%') LIMIT 50`],
  ];
  const explains = [];
  for (const [label, sql] of explainQueries) {
    const out = await handle.exec(sql);
    explains.push({ label, text: out.map((r) => r.rows.map((row) => row['QUERY PLAN']).join('\n')).join('\n') });
  }
  const indexes = await handle.exec(`SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname`);
  const indexRows = indexes[0]?.rows ?? [];

  const fmt = (n) => n.toFixed(1);
  const lines = [];
  lines.push(`# BACKEND_PERF_BASELINE${ITEM_COUNT !== 1000 ? `_${ITEM_COUNT}` : ''}.md — 后端性能基线（DB-3 + SRE-2，N=${ITEM_COUNT}）`);
  lines.push('');
  lines.push(`> Generated by \`scripts/bench-backend.mjs\` — ${new Date().toISOString()}`);
  lines.push(`> Environment: PGlite (embedded Postgres/WASM), Node ${process.version}, ${ITEM_COUNT} items + ${CONTEXT_COUNT} contexts + ${RELATION_COUNT} relations + derived events.`);
  lines.push('> ⚠️ PGlite 数字是应用层基线；DB-1 postgres 验收落地后须在同一脚本下复测对比（含 pg_stat_statements）。');
  lines.push('> 写吞吐的策略上限是 O1-5 token bucket（60/min/key）——写负载在桶内测延迟，限流本身即产品吞吐策略。');
  lines.push('');
  lines.push('## 1. Workloads（HTTP 端到端，warmup 16，concurrency 8）');
  lines.push('');
  lines.push('| 工作负载 | 请求 | p50 (ms) | p95 (ms) | p99 (ms) | tps |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of results) {
    lines.push(`| ${r.label} | ${r.total} | ${fmt(r.p50)} | ${fmt(r.p95)} | ${fmt(r.p99)} | ${fmt(r.tps)} |`);
  }
  lines.push('');
  lines.push('## 2. EXPLAIN (ANALYZE, BUFFERS) 基线');
  lines.push('');
  lines.push('> 与 repo 查询同谓词/同排序的等价 SQL（表/列名取自 `server/persistence/schema.ts`）。');
  for (const e of explains) {
    lines.push(`### ${e.label}`);
    lines.push('');
    lines.push('```');
    lines.push(e.text);
    lines.push('```');
    lines.push('');
  }
  lines.push('## 3. 索引清单');
  lines.push('');
  lines.push('| table | index |');
  lines.push('|---|---|');
  for (const row of indexRows) lines.push(`| ${row.tablename} | ${row.indexname} |`);
  lines.push('');
  const outPath = process.env.BENCH_OUT ?? '../docs/BACKEND_PERF_BASELINE.md';
  writeFileSync(new URL(outPath, import.meta.url), lines.join('\n'));
  process.stdout.write(`[bench] wrote ${outPath}\n`);
} finally {
  server.close();
  await handle.close();
  rmSync(dir, { recursive: true, force: true });
}
