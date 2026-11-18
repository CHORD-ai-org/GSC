import { rm } from 'node:fs/promises';
import { readConfig } from '../config.ts';

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = readConfig(process.env);
  await rm(config.pgliteDir, { recursive: true, force: true });
  process.stdout.write(`[gsc] reset local PGlite data at ${config.pgliteDir}\n`);
}
