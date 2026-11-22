/**
 * Source sync scheduler (T402). Honours `source.frequency`:
 *   - 'manual'  — never auto-syncs (explicit user action only);
 *   - 'daily'   — syncs when >= 24h since the last successful sync.
 * Sources that are paused/disconnected are skipped. Runs inside the API server
 * on a timer; overlaps are guarded by a running flag and every source is
 * individually booked through `markSync`, while downstream imports stay
 * idempotent (content-hash snapshots / source_label dedupe).
 */
import type { Config } from '../config.ts';
import type { Database } from '../persistence/client.ts';
import { log } from '../log.ts';
import { listSources, markSync } from '../repo/sources.ts';
import type { SourceDTO } from '../../src/lib/sources.ts';
import { readSecret } from '../storage/secrets.ts';
import { runGithubSync } from './github.ts';
import { runSourceSync } from '../intel/pipeline.ts';

const DAY_MS = 86_400_000;

/** Interval per frequency value; unmapped values ('manual') never auto-run. */
const INTERVALS: Record<string, number> = {
  daily: DAY_MS,
};

export function isDue(source: SourceDTO, now: number): boolean {
  if (source.status !== 'connected') return false;
  const interval = INTERVALS[source.frequency];
  if (!interval) return false;
  const last = source.last_sync_at ? Date.parse(source.last_sync_at) : NaN;
  if (!Number.isFinite(last)) return true; // never synced
  return now - last >= interval;
}

export async function runDueSyncs(
  db: Database,
  config: Config,
  secretsDir: string,
  now = Date.now(),
): Promise<{ due: number; ok: number; failed: number }> {
  const due = (await listSources(db)).filter((s) => isDue(s, now));
  let ok = 0;
  let failed = 0;
  for (const source of due) {
    try {
      const token = readSecret(secretsDir, source.id);
      if (source.kind === 'github') {
        await runGithubSync(db, source, token);
      } else {
        await runSourceSync(db, config, source, token);
      }
      await markSync(db, source.id, { ok: true });
      ok += 1;
      log('info', 'sync.scheduled', { source: source.id, kind: source.kind });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Scheduled sync failed';
      await markSync(db, source.id, { ok: false, message });
      failed += 1;
      log('warn', 'sync.scheduled.fail', { source: source.id, kind: source.kind, message });
    }
  }
  return { due: due.length, ok, failed };
}

/** Timer loop; returns a handle so tests and shutdown can stop it. */
export function startSyncScheduler(
  db: Database,
  config: Config,
  secretsDir: string,
  everyMs = 300_000,
): { stop: () => void } {
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    void runDueSyncs(db, config, secretsDir).finally(() => {
      running = false;
    });
  }, everyMs);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}
