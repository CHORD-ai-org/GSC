import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig } from '../config.ts';
import { getDatabase } from './client.ts';

const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(here, 'migrations', '0000_init.sql');

export function migrationSql(): string {
  return readFileSync(migrationPath, 'utf8');
}

export async function migrate(dataDir?: string): Promise<void> {
  const config = readConfig(process.env);
  const handle = getDatabase(dataDir ?? config.pgliteDir);
  await handle.exec(migrationSql());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await migrate();
  process.stdout.write('[gsc] migrations applied\n');
}
