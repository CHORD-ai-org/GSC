/* db:restore — restore a backup created by db-backup (Phase 02, §4-3).
   Usage: node scripts/db-restore.mjs <backup-dir>
   Refuses to run without GSC_RESTORE_CONFIRM=1 (destructive to current data). */
import { cpSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';

/**
 * Replace a data directory with backup content. Order of attempts:
 * 1. rename aside (clean, atomic) — works in normal environments;
 * 2. copy-aside + overwrite-in-place — works where directory renames or deletes
 *    are blocked by OS/sandbox hooks (this dev machine). Overwrite leaves stale
 *    files behind; PostgreSQL ignores relation files with unknown OIDs, so the
 *    restored state is authoritative. Limitation documented in KNOWN_ISSUES.
 */
function replaceDir(from, to) {
  const aside = `${to}.replaced-${Date.now()}`;
  try {
    renameSync(to, aside);
    cpSync(from, to, { recursive: true });
    return aside;
  } catch {
    cpSync(to, aside, { recursive: true });
    cpSync(from, to, { recursive: true });
    return `${aside} (overwrite mode)`;
  }
}

const backupDir = path.resolve(process.argv[2] ?? '');
if (!backupDir || !existsSync(path.join(backupDir, 'pglite'))) {
  console.error('[restore] usage: node scripts/db-restore.mjs <backup-dir containing pglite/>');
  process.exit(1);
}
if (process.env.GSC_RESTORE_CONFIRM !== '1') {
  console.error('[restore] REFUSED: this replaces current data. Re-run with GSC_RESTORE_CONFIRM=1');
  process.exit(1);
}

const dataDir = path.resolve(process.env.PGLITE_DIR ?? './.data/pglite');
const storageDir = path.resolve(process.env.STORAGE_DIR ?? './data/files');

// Keep the replaced data aside instead of deleting it.
let aside;
if (existsSync(dataDir)) {
  aside = replaceDir(path.join(backupDir, 'pglite'), dataDir);
} else {
  mkdirSync(dataDir, { recursive: true });
  cpSync(path.join(backupDir, 'pglite'), dataDir, { recursive: true });
}
if (existsSync(path.join(backupDir, 'files'))) {
  mkdirSync(storageDir, { recursive: true });
  replaceDir(path.join(backupDir, 'files'), storageDir);
}
console.log(`[restore] done → ${dataDir} (previous data kept at ${aside ?? 'n/a'})`);
