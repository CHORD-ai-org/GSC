import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { schema } from './schema.ts';

export type DatabaseOptions = {
  dataDir?: string;
};

function wrap(client: PGlite) {
  const db = drizzle(client, { schema });
  return {
    client,
    db,
    close: () => client.close(),
    exec: (sql: string) => client.exec(sql),
  };
}

export function createDatabase(options: DatabaseOptions = {}) {
  return wrap(options.dataDir ? new PGlite(options.dataDir) : new PGlite());
}

export async function openDatabase(options: DatabaseOptions = {}) {
  const client = options.dataDir
    ? await PGlite.create(options.dataDir)
    : await PGlite.create();
  return wrap(client);
}

export type DatabaseHandle = ReturnType<typeof wrap>;
export type Database = DatabaseHandle['db'];

let shared: DatabaseHandle | undefined;

export async function getDatabase(dataDir?: string): Promise<DatabaseHandle> {
  if (!shared) shared = await openDatabase({ dataDir });
  return shared;
}

export function setDatabase(handle: DatabaseHandle): void {
  shared = handle;
}
