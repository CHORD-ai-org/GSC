import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase } from '../persistence/client.ts';
import type { DatabaseHandle } from '../persistence/client.ts';
import { migrationSql } from '../persistence/migrate.ts';
import { upsertSnapshot } from '../repo/snapshots.ts';
import { getAdapter, ADAPTERS } from './adapters/index.ts';
import { extractHtml, contentHash, normalizeUrl } from './extract.ts';

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
