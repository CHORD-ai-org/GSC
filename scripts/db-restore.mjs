/* db:restore — restore a backup created by db-backup (Phase 02, §4-3).
   Usage: node scripts/db-restore.mjs <backup-dir>
   Refuses to run without GSC_RESTORE_CONFIRM=1 (destructive to current data). */
import { cpSync, existsSync, rmSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';

/** Directory rename can be denied by OS-level handles; fall back to content-level replace. */
function replaceDir(from, to) {
  const aside = `${to}.replaced-${Date.now()}`;
  try {
    renameSync(to, aside);
  } catch {
    cpSync(to, aside, { recursive: true });
    for (const entry of readdirSync(to)) rmSync(path.join(to, entry), { recursive: true, force: true });
  }
  cpSync(from, to, { recursive: true });
  return aside;
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
import { readdirSync } from 'node:fs';
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
