/**
 * PAT-style API tokens (D-058): hashed at rest in `.data/api-tokens.json`,
 * `read` / `rw` scopes, enforced only when GSC_AUTH_REQUIRED=1.
 */
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type TokenScope = 'read' | 'rw';

type TokenRecord = { name: string; scope: TokenScope; sha256: string; userId?: string; created_at?: string };
type TokenMap = Record<string, TokenRecord>;

export const DEFAULT_USER_ID = 'usr_local';

function fileFor(dataDir: string): string {
  return path.join(dataDir, 'api-tokens.json');
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function readAll(dataDir: string): TokenMap {
  try {
    return JSON.parse(readFileSync(fileFor(dataDir), 'utf8')) as TokenMap;
  } catch {
    return {};
  }
}

/** Mint a token; returns the plaintext exactly once. */
export function createApiToken(dataDir: string, name: string, scope: TokenScope, userId: string = DEFAULT_USER_ID): { id: string; token: string } {
  mkdirSync(dataDir, { recursive: true });
  const token = `gsc_${randomBytes(24).toString('hex')}`;
  const id = `tok_${randomBytes(6).toString('hex')}`;
  const map = readAll(dataDir);
  map[id] = { name, scope, sha256: hash(token), userId, created_at: new Date().toISOString() };
  writeFileSync(fileFor(dataDir), JSON.stringify(map, null, 2), 'utf8');
  return { id, token };
}

export type TokenSummary = { id: string; name: string; scope: TokenScope; userId: string; created_at: string };

/** List tokens (safe metadata only — never the secret or its hash). */
export function listTokens(dataDir: string): TokenSummary[] {
  const map = readAll(dataDir);
  return Object.entries(map).map(([id, r]) => ({
    id,
    name: r.name,
    scope: r.scope,
    userId: r.userId ?? DEFAULT_USER_ID,
    created_at: r.created_at ?? '',
  }));
}

export function verifyApiToken(dataDir: string, presented: string): { scope: TokenScope; userId: string } | null {
  const digest = hash(presented);
  for (const record of Object.values(readAll(dataDir))) {
    if (record.sha256 === digest) return { scope: record.scope, userId: record.userId ?? DEFAULT_USER_ID };
  }
  return null;
}

export function revokeApiToken(dataDir: string, id: string): boolean {
  const map = readAll(dataDir);
  if (!(id in map)) return false;
  delete map[id];
  writeFileSync(fileFor(dataDir), JSON.stringify(map, null, 2), 'utf8');
  return true;
}
