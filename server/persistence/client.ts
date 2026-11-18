import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { schema } from './schema.ts';

export type DatabaseOptions = {
  dataDir?: string;
};

export function createDatabase(options: DatabaseOptions = {}) {
  const client = options.dataDir ? new PGlite(options.dataDir) : new PGlite();
  const db = drizzle(client, { schema });
  return {
    client,
    db,
    close: () => client.close(),
    exec: (sql: string) => client.exec(sql),
  };
}

export type DatabaseHandle = ReturnType<typeof createDatabase>;
export type Database = DatabaseHandle['db'];

let shared: DatabaseHandle | undefined;

export function getDatabase(dataDir?: string): DatabaseHandle {
  if (!shared) shared = createDatabase({ dataDir });
  return shared;
}

export function setDatabase(handle: DatabaseHandle): void {
  shared = handle;
}
