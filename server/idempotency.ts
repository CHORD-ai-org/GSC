/**
 * Idempotency-Key support (Phase 02, spec §4): a repeated write with the same
 * key replays the first response instead of executing again.
 */
import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from './persistence/client.ts';
import { idempotencyKeys } from './persistence/schema.ts';

export function requestHash(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');
}

export type StoredResponse = { status: number; body: string };

export async function recallIdempotent(
  db: Database,
  key: string,
  endpoint: string,
  hash: string,
): Promise<StoredResponse | 'mismatch' | undefined> {
  const [row] = await db.select().from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);
  if (!row || row.endpoint !== endpoint) return undefined;
  if (row.request_hash !== hash) return 'mismatch';
  return { status: row.status, body: row.body };
}

export async function storeIdempotent(
  db: Database,
  key: string,
  endpoint: string,
  hash: string,
  response: StoredResponse,
): Promise<void> {
  await db.insert(idempotencyKeys).values({
    key,
    endpoint,
    request_hash: hash,
    status: response.status,
    body: response.body,
    created_at: new Date(),
  });
}

/**
 * Wrap a write handler: replay stored 2xx responses for the same key,
 * reject same-key/different-body with 409, store successes once.
 */
export async function idempotentWrite(
  db: Database,
  key: string | undefined,
  endpoint: string,
  body: unknown,
  exec: () => Promise<{ status: number; json: unknown }>,
): Promise<{ status: number; json: unknown }> {
  if (!key) return exec();
  const hash = requestHash(body);
  const stored = await recallIdempotent(db, key, endpoint, hash);
  if (stored === 'mismatch') {
    return { status: 409, json: { ok: false, kind: 'conflict', message: 'Idempotency-Key reused with a different body', retryable: false } };
  }
  if (stored) {
    return { status: stored.status, json: JSON.parse(stored.body) };
  }
  const result = await exec();
  if (result.status < 400) {
    await storeIdempotent(db, key, endpoint, hash, { status: result.status, body: JSON.stringify(result.json) });
  }
  return result;
}

export function newRequestId(): string {
  return `req_${randomUUID().slice(0, 12)}`;
}
