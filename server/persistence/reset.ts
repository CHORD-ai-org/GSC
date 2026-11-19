import { rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readConfig } from '../config.ts';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = readConfig(process.env);
  await rm(config.pgliteDir, { recursive: true, force: true });
  process.stdout.write(`[gsc] reset local PGlite data at ${config.pgliteDir}\n`);
}
