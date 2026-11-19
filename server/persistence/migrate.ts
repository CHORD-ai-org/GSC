import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readConfig } from '../config.ts';
import { getDatabase } from './client.ts';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, 'migrations');

export function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

export function migrationSql(): string {
  return migrationFiles()
    .map((name) => readFileSync(join(migrationsDir, name), 'utf8'))
    .join('\n\n');
}

export async function migrate(dataDir?: string): Promise<void> {
  const config = readConfig(process.env);
  const dir = dataDir ?? config.pgliteDir;
  mkdirSync(dir, { recursive: true });
  const handle = await getDatabase(dir);
  await handle.exec(migrationSql());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = readConfig(process.env);
  mkdirSync(config.pgliteDir, { recursive: true });
  const handle = await getDatabase(config.pgliteDir);
  await handle.exec(migrationSql());
  await handle.close();
  process.stdout.write(`[gsc] ${migrationFiles().length} migrations applied\n`);
}
