import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/* Hermetic DNS: the SSRF pre-check resolves hostnames via node:dns/promises;
   stub it so the capture journey never depends on live DNS (sandbox-safe). */
vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
}));
import { createDatabase } from '../persistence/client.ts';
import type { DatabaseHandle } from '../persistence/client.ts';
import { migrationSql } from '../persistence/migrate.ts';
import { upsertSnapshot } from '../repo/snapshots.ts';
import { getAdapter, ADAPTERS } from './adapters/index.ts';
import { extractHtml, contentHash, normalizeUrl } from './extract.ts';
import { runSourceSync } from './pipeline.ts';
import { processCaptureTask } from './pipeline.ts';
import { createSource } from '../repo/sources.ts';
import { items } from '../persistence/schema.ts';
import { like } from 'drizzle-orm';
import type { Config } from '../config.ts';

describe('web intelligence', () => {
  let handle: DatabaseHandle;
  let db: DatabaseHandle['db'];

  beforeAll(async () => {
    handle = createDatabase();
    await handle.exec(migrationSql());
    db = handle.db;
  });

  afterAll(async () => {
    await handle?.close();
  });

  it('exposes all seven source kinds', () => {
    for (const kind of ['web', 'rss', 'file', 'github', 'notion', 'drive', 'x']) {
      expect(ADAPTERS[kind]).toBeTruthy();
    }
  });

  it('extractHtml pulls title, meta, and text with a stable hash', () => {
    const html =
      '<html><head><title>T</title><meta name="author" content="A"><meta name="description" content="D"></head><body><p>Hello</p></body></html>';
    const ex = extractHtml(html, 'https://example.com/a?utm_source=x');
    expect(ex.title).toBe('T');
    expect(ex.author).toBe('A');
    expect(ex.description).toBe('D');
    expect(ex.contentText).toContain('Hello');
    expect(ex.contentHash).toBe(contentHash(ex.contentText));
    expect(ex.url).not.toContain('utm_source');
    expect(ex.status).toBe('ok');
  });

  it('normalizeUrl strips tracking params', () => {
    expect(normalizeUrl('https://e.com/p?utm_a=1&keep=2')).toBe('https://e.com/p?keep=2');
  });

  it('file adapter returns provided content', async () => {
    const docs = await getAdapter('file').fetch({ label: 'n.md', scope: '# T\n\nBody' });
    expect(docs[0].contentText).toContain('Body');
    expect(docs[0].rawHash).toBeTruthy();
  });

  it('web probe rejects private addresses (SSRF)', async () => {
    const res = await getAdapter('web').probe({ label: 'http://127.0.0.1/x', scope: '' });
    expect(res.ok).toBe(false);
    const res2 = await getAdapter('web').probe({ label: 'http://169.254.169.254/meta', scope: '' });
    expect(res2.ok).toBe(false);
  });

  it('snapshot upsert is idempotent on identical content', async () => {
    const doc = { externalId: 'u1', url: 'u1', title: 'T', contentText: 'body', rawHash: 'h1' };
    const a = await upsertSnapshot(db, null, doc);
    const b = await upsertSnapshot(db, null, doc);
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.id).toBe(a.id);
  });

  it('changed content creates a new snapshot version', async () => {
    const base = { externalId: 'u2', url: 'u2', title: 'T', contentText: 'v1', rawHash: 'h2' };
    await upsertSnapshot(db, null, base);
    const changed = await upsertSnapshot(db, null, { ...base, contentText: 'v2', rawHash: 'h3' });
    expect(changed.created).toBe(true);
  });
});

describe('source sync (runSourceSync)', () => {
  let handle: DatabaseHandle;
  let db: DatabaseHandle['db'];

  // Config stub with a remote base_url and no API key → chatComplete throws fast,
  // proving raw import still succeeds when the LLM is unavailable (resilience).
  const cfg = {
    llmBaseUrl: 'https://remote.invalid/v1',
    llmApiKey: '',
    llmModel: 'm',
    llmTimeoutMs: 50,
    llmMaxRetries: 0,
    llmRetryBaseMs: 1,
  } as unknown as Config;

  beforeAll(async () => {
    handle = createDatabase();
    await handle.exec(migrationSql());
    db = handle.db;
  });

  afterAll(async () => {
    await handle?.close();
  });

  it('imports file content into a real item and preserves provenance (fake→real)', async () => {
    const source = await createSource(db, { kind: 'file', label: 'note.md', scope: '# Title\n\nReal body content for sync.' });
    const r1 = await runSourceSync(db, cfg, source, '');
    expect(r1).toEqual({ imported: 1, skipped: 0 });

    const rows = await db.select().from(items).where(like(items.source_label, 'sync:file:%'));
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe('note.md');
    expect(rows[0].origin).toBe('import');
    expect(rows[0].source_label.startsWith('sync:file:')).toBe(true);
  });

  it('is idempotent: re-syncing identical content skips (no duplicate items)', async () => {
    const source = await createSource(db, { kind: 'file', label: 'dup.md', scope: 'Stable content body.' });
    const first = await runSourceSync(db, cfg, source, '');
    expect(first).toEqual({ imported: 1, skipped: 0 });
    const second = await runSourceSync(db, cfg, source, '');
    expect(second).toEqual({ imported: 0, skipped: 1 });
    const rows = await db.select().from(items).where(like(items.source_label, 'sync:file:%'));
    expect(rows.filter((r) => r.title === 'dup.md').length).toBe(1);
  });

  it('processCaptureTask runs the URL capture journey: extract → item + provenance, idempotent', async () => {
    const html = '<html><head><title>Captured Article</title></head><body><p>Deep content about systems.</p></body></html>';
    const fakeFetch = async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
    const task = { id: 'tsk_test1', kind: 'web', url: 'https://example.com/article', source_id: null };
    const outcome = await processCaptureTask(db, cfg, task, fakeFetch as never);
    expect(outcome.fetched).toBe(1);
    expect(outcome.imported).toBe(1);

    const rows = await db.select().from(items).where(like(items.source_label, 'sync:web:%'));
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe('Captured Article');
    expect(rows[0].origin).toBe('import');

    // Idempotent: re-capturing unchanged content is a no-op (snapshot dedupe).
    const again = await processCaptureTask(db, cfg, task, fakeFetch as never);
    expect(again.imported).toBe(0);
    const after = await db.select().from(items).where(like(items.source_label, 'sync:web:%'));
    expect(after.length).toBe(1);
  });
});
