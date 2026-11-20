/**
 * On-machine secret store (D-050): tokens live in `.data/secrets.json`
 * (gitignored) — never in the database, never in git.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type SecretMap = Record<string, string>;

function fileFor(dataDir: string): string {
  return path.join(dataDir, 'secrets.json');
}

export function readSecret(dataDir: string, sourceId: string): string {
  try {
    const map = JSON.parse(readFileSync(fileFor(dataDir), 'utf8')) as SecretMap;
    return map[sourceId] ?? '';
  } catch {
    return '';
  }
}

export function writeSecret(dataDir: string, sourceId: string, token: string): void {
  mkdirSync(dataDir, { recursive: true });
  let map: SecretMap = {};
  try {
    map = JSON.parse(readFileSync(fileFor(dataDir), 'utf8')) as SecretMap;
  } catch {
    map = {};
  }
  if (token) map[sourceId] = token;
  else delete map[sourceId];
  writeFileSync(fileFor(dataDir), JSON.stringify(map, null, 2), 'utf8');
}
