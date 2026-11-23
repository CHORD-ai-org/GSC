import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { log } from '../log.ts';
import { schema } from './schema.ts';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

export type DatabaseOptions = {
  dataDir?: string;
  /** DB-1: 'pglite' (embedded default) or 'postgres' (deployment adapter). */
  adapter?: 'pglite' | 'postgres';
  /** postgres adapter DSN (DATABASE_URL). */
  dsn?: string;
};

/** exec() result shape: one entry per statement, each with its rows. */
export type ExecRows = { rows: Record<string, unknown>[] }[];

/**
 * The single Database type callers program against. Both adapters surface the
 * same drizzle pg-core surface for the operations this codebase uses; the
 * postgres adapter casts at this seam (BACKEND_OPTIMIZATION_PLAN DB-1) so repo
 * code stays adapter-agnostic.
 */
export type Database = PgliteDatabase<typeof schema>;

export type DatabaseHandle = {
  kind: 'pglite' | 'postgres';
  db: Database;
  close: () => Promise<void>;
  exec: (sql: string) => Promise<ExecRows>;
};

function wrapPglite(client: PGlite): DatabaseHandle {
  const db = drizzlePglite(client, { schema });
  return {
    kind: 'pglite',
    db,
    close: () => client.close(),
    exec: async (sql: string) => {
      const results = await client.exec(sql);
      return results.map((r) => ({ rows: (r.rows ?? []) as Record<string, unknown>[] }));
    },
  };
}

function wrapPg(pool: pg.Pool): DatabaseHandle {
  // F-3 (strict re-audit): an idle-client error without a listener is an
  // unhandled 'error' event and kills the process.
  pool.on('error', (err: Error) => {
    log('warn', 'postgres pool error', { error: err?.message ?? String(err) });
  });
  const db = drizzlePg(pool, { schema }) as unknown as Database;
  return {
    kind: 'postgres',
    db,
    close: () => pool.end(),
    exec: async (sql: string) => {
      const result = await pool.query(sql);
      const results = (Array.isArray(result) ? result : [result]) as pg.QueryResult[];
      return results.map((r) => ({ rows: (r.rows ?? []) as Record<string, unknown>[] }));
    },
  };
}

function openFromOptions(options: DatabaseOptions): DatabaseHandle {
  if ((options.adapter ?? 'pglite') === 'postgres') {
    if (!options.dsn) throw new Error('postgres adapter requires a DSN (DATABASE_URL)');
    return wrapPg(new pg.Pool({ connectionString: options.dsn, max: 5 }));
  }
  return wrapPglite(options.dataDir ? new PGlite(options.dataDir) : new PGlite());
}

export function createDatabase(options: DatabaseOptions = {}): DatabaseHandle {
  return openFromOptions({ adapter: 'pglite', ...options });
}

export async function openDatabase(options: DatabaseOptions = {}): Promise<DatabaseHandle> {
  if ((options.adapter ?? 'pglite') === 'postgres') {
    return openFromOptions(options);
  }
  const client = options.dataDir
    ? await PGlite.create(options.dataDir)
    : await PGlite.create();
  return wrapPglite(client);
}

let shared: DatabaseHandle | undefined;

export async function getDatabase(dataDirOrOptions?: string | DatabaseOptions): Promise<DatabaseHandle> {
  const options: DatabaseOptions = typeof dataDirOrOptions === 'string'
    ? { dataDir: dataDirOrOptions }
    : (dataDirOrOptions ?? {});
  if (!shared) shared = await openDatabase(options);
  return shared;
}

export function setDatabase(handle: DatabaseHandle): void {
  shared = handle;
}
