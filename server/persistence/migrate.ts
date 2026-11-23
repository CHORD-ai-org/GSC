import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readConfig } from '../config.ts';
import { getDatabase, type DatabaseHandle, type DatabaseOptions } from './client.ts';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, 'migrations');

export function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

/** Raw concatenation of every migration — tests bootstrap fresh DBs with this. */
export function migrationSql(): string {
  return migrationFiles()
    .map((name) => readFileSync(join(migrationsDir, name), 'utf8'))
    .join('\n\n');
}

const VERSION_TABLE_DDL = `CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

/**
 * DB-2: versioned migration runner. Every applied file is recorded in
 * `schema_migrations`; startup only runs pending files instead of replaying
 * the whole directory (the replay grew past its "≤10 files reliable" note at
 * 13 files). Legacy databases (created before this table existed) are stamped
 * as fully applied without replaying, so no already-applied file runs twice.
 */
export async function applyPendingMigrations(handle: DatabaseHandle): Promise<string[]> {
  await handle.exec(VERSION_TABLE_DDL);
  const appliedRows = await handle.exec('SELECT filename FROM schema_migrations');
  const applied = new Set(appliedRows[0]?.rows.map((r) => String(r.filename)) ?? []);
  const files = migrationFiles();

  if (applied.size === 0) {
    const probe = await handle.exec("SELECT to_regclass('public.items') AS reg");
    const legacyDatabase = Boolean(probe[0]?.rows[0]?.reg);
    if (legacyDatabase) {
      for (const name of files) {
        await handle.exec(`INSERT INTO schema_migrations (filename) VALUES ('${name}') ON CONFLICT DO NOTHING`);
      }
      return [];
    }
  }

  const ran: string[] = [];
  for (const name of files) {
    if (applied.has(name)) continue;
    await handle.exec(readFileSync(join(migrationsDir, name), 'utf8'));
    await handle.exec(`INSERT INTO schema_migrations (filename) VALUES ('${name}') ON CONFLICT DO NOTHING`);
    ran.push(name);
  }
  return ran;
}

export async function migrate(dataDirOrOptions?: string | DatabaseOptions): Promise<string[]> {
  const config = readConfig(process.env);
  const options: DatabaseOptions = typeof dataDirOrOptions === 'string'
    ? { dataDir: dataDirOrOptions }
    : (dataDirOrOptions ?? {});
  const dir = options.dataDir ?? config.pgliteDir;
  if ((options.adapter ?? config.dbAdapter) === 'pglite') mkdirSync(dir, { recursive: true });
  const handle = await getDatabase({
    adapter: options.adapter ?? config.dbAdapter,
    dsn: options.dsn ?? config.pgDsn,
    dataDir: dir,
  });
  return applyPendingMigrations(handle);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const applied = await migrate();
  process.stdout.write(`[gsc] ${applied.length} migrations applied (${migrationFiles().length} total)\n`);
  const handle = await getDatabase();
  await handle.close();
}
