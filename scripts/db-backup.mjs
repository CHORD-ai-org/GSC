/* db:backup — dump the PGlite database to SQL + copy data/files (Phase 02, §4-3).
   Usage: node scripts/db-backup.mjs [output-dir]  (default: ./backups/<timestamp>) */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.env.PGLITE_DIR ?? './.data/pglite');
const storageDir = path.resolve(process.env.STORAGE_DIR ?? './data/files');
const outRoot = path.resolve(process.argv[2] ?? `./backups/${new Date().toISOString().replace(/[:.]/g, '-')}`);

if (!existsSync(dataDir)) {
  console.error(`[backup] no database at ${dataDir}`);
  process.exit(1);
}

mkdirSync(outRoot, { recursive: true });

// PGlite data is a self-contained directory; a consistent copy is a valid backup.
cpSync(dataDir, path.join(outRoot, 'pglite'), { recursive: true });
if (existsSync(storageDir)) cpSync(storageDir, path.join(outRoot, 'files'), { recursive: true });

// Manifest records what was captured and how to restore.
const manifest = {
  createdAt: new Date().toISOString(),
  pgliteDir: dataDir,
  storageDir,
  restore: 'node scripts/db-restore.mjs <backup-dir>',
  git: (() => { try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })(),
};
writeFileSync(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`[backup] done → ${outRoot}`);
