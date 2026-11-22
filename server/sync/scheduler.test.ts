import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDatabase } from '../persistence/client.ts';
import type { DatabaseHandle } from '../persistence/client.ts';
import { migrationSql } from '../persistence/migrate.ts';
import { readConfig } from '../config.ts';
import { createSource, listSources, updateSource } from '../repo/sources.ts';
import { isDue, runDueSyncs } from './scheduler.ts';

let db: DatabaseHandle;
let dir: string;
const cfg = readConfig({ GSC_LLM_API_KEY: '' });

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'gsc-sched-'));
  db = createDatabase();
  await db.exec(migrationSql());
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('sync scheduler (T402 — frequency real)', () => {
  it('isDue: manual never auto-runs; daily runs when never synced or >24h old', () => {
    const now = Date.parse('2026-11-21T12:00:00Z');
    const base = {
      id: 'src_x', kind: 'file' as const, label: 'x.md', scope: '', status: 'connected' as const,
      frequency: 'manual' as const, last_sync_at: '', last_error: '', created_at: '', updated_at: '',
    };
    expect(isDue({ ...base, frequency: 'manual' }, now)).toBe(false);
    expect(isDue({ ...base, frequency: 'daily', last_sync_at: '' }, now)).toBe(true);
    expect(isDue({ ...base, frequency: 'daily', last_sync_at: new Date(now - 25 * 3600_000).toISOString() }, now)).toBe(true);
    expect(isDue({ ...base, frequency: 'daily', last_sync_at: new Date(now - 1 * 3600_000).toISOString() }, now)).toBe(false);
    expect(isDue({ ...base, frequency: 'daily', status: 'paused' }, now)).toBe(false);
  });

  it('runDueSyncs syncs due sources once and books last_sync_at (second pass no-ops)', async () => {
    const source = await createSource(db.db, {
      kind: 'file',
      label: `sched-${Date.now()}.md`,
      scope: 'Scheduler determinism body.',
      frequency: 'daily',
    });
    const now = Date.now();
    const first = await runDueSyncs(db.db, cfg, dir, now);
    expect(first.due).toBeGreaterThanOrEqual(1);
    expect(first.ok).toBe(first.due);
    expect(first.failed).toBe(0);
    // Second pass at the same instant: last_sync_at just booked → nothing due.
    const second = await runDueSyncs(db.db, cfg, dir, now);
    expect(second.due).toBe(0);

    const updated = (await listSources(db.db)).find((s) => s.id === source.id)!;
    expect(updated.last_sync_at).not.toBe('');
    expect(updated.last_error).toBe('');
  });

  it('a paused source is skipped even when overdue', async () => {
    const source = await createSource(db.db, {
      kind: 'file',
      label: `paused-${Date.now()}.md`,
      scope: 'Body.',
      frequency: 'daily',
    });
    await updateSource(db.db, source.id, { status: 'paused' });
    // 30 days later other daily sources are due again — but the paused one must not sync.
    await runDueSyncs(db.db, cfg, dir, Date.now() + 30 * 86_400_000);
    const after = (await listSources(db.db)).find((s) => s.id === source.id)!;
    expect(after.last_sync_at).toBe('');
  });
});
