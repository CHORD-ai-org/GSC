import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type DatabaseHandle } from '../persistence/client.ts';
import { migrationSql } from '../persistence/migrate.ts';
import { createSource, getSource, markSync } from '../repo/sources.ts';
import { runGithubSync } from './github.ts';
import { listItems } from '../repo/items.ts';
import { readSecret, writeSecret } from '../storage/secrets.ts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let handle: DatabaseHandle;

beforeEach(async () => {
  handle = createDatabase();
  await handle.exec(migrationSql());
});

function fakeFetch(issues: unknown[]) {
  return async () =>
    new Response(JSON.stringify(issues), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('github source adapter', () => {
  it('imports issues as raw items and dedupes on re-sync', async () => {
    const source = await createSource(handle.db, { kind: 'github', label: 'acme/widgets', token: 't' });
    const issues = [
      { number: 1, title: 'Bug in parser', body: 'Steps to repro', user: { login: 'ceaser' }, html_url: '', state: 'open', updated_at: '' },
      { number: 2, title: 'Feature idea', body: null, user: null, html_url: '', state: 'closed', updated_at: '' },
    ];

    const first = await runGithubSync(handle.db, source, 'token', fakeFetch(issues) as never);
    expect(first).toEqual({ imported: 2, skipped: 0 });

    const items = await listItems(handle.db);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.origin === 'import')).toBe(true);
    expect(items.map((i) => i.source_label).sort()).toEqual([
      'sync:github:acme/widgets#1',
      'sync:github:acme/widgets#2',
    ]);

    const second = await runGithubSync(handle.db, source, 'token', fakeFetch(issues) as never);
    expect(second).toEqual({ imported: 0, skipped: 2 });
  });

  it('records sync outcomes on the source', async () => {
    const source = await createSource(handle.db, { kind: 'github', label: 'a/b' });
    await markSync(handle.db, source.id, { ok: false, message: 'rate limited' });
    const errored = await getSource(handle.db, source.id);
    expect(errored?.status).toBe('error');
    expect(errored?.last_error).toBe('rate limited');
    await markSync(handle.db, source.id, { ok: true });
    const fixed = await getSource(handle.db, source.id);
    expect(fixed?.status).toBe('connected');
    expect(fixed?.last_sync_at).not.toBe('');
    expect(fixed?.last_error).toBe('');
  });

  it('stores tokens outside the database', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-secrets-'));
    try {
      writeSecret(dir, 'src_1', 'ghp_secret');
      expect(readSecret(dir, 'src_1')).toBe('ghp_secret');
      writeSecret(dir, 'src_1', '');
      expect(readSecret(dir, 'src_1')).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
