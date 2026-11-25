/**
 * Source snapshots (Web Intelligence §5): captured versions of external content.
 * Idempotent on (external_id, content_hash) so re-capturing identical content
 * is a no-op; changed content produces a new snapshot (version history).
 */
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { sourceSnapshots } from '../persistence/schema.ts';
import type { FetchedDoc } from '../intel/adapters/types.ts';
import { EXTRACTOR_VERSION } from '../intel/extract.ts';

export type SnapshotRow = typeof sourceSnapshots.$inferSelect;

export async function upsertSnapshot(
  db: Database,
  sourceId: string | null,
  doc: FetchedDoc,
): Promise<{ id: string; created: boolean }> {
  const [existing] = await db
    .select({ id: sourceSnapshots.id })
    .from(sourceSnapshots)
    .where(and(eq(sourceSnapshots.external_id, doc.externalId), eq(sourceSnapshots.content_hash, doc.rawHash)))
    .limit(1);
  if (existing) return { id: existing.id, created: false };

  const id = `snap_${randomUUID()}`;
  await db.insert(sourceSnapshots).values({
    id,
    source_id: sourceId,
    external_id: doc.externalId,
    url: doc.url,
    canonical_url: doc.metadata?.canonical ?? doc.url,
    title: doc.title,
    content_text: doc.contentText,
    author: doc.author ?? '',
    published_at: doc.publishedAt ?? '',
    site_name: doc.siteName ?? '',
    description: doc.description ?? '',
    content_hash: doc.rawHash,
    extractor_version: EXTRACTOR_VERSION,
    status: 'ok',
    error: '',
    retrieved_at: new Date(),
  });
  return { id, created: true };
}

export async function listSnapshotsBySource(db: Database, sourceId: string): Promise<SnapshotRow[]> {
  return db.select().from(sourceSnapshots).where(eq(sourceSnapshots.source_id, sourceId));
}

export async function getSnapshot(db: Database, id: string): Promise<SnapshotRow | undefined> {
  const [row] = await db.select().from(sourceSnapshots).where(eq(sourceSnapshots.id, id)).limit(1);
  return row;
}

/** Integrations status: newest snapshot time per source (ISO) — presence =
 *  "connected", freshness = last activity. */
export async function latestSnapshotAtBySource(db: Database): Promise<Map<string, string>> {
  const rows = await db.select().from(sourceSnapshots);
  const map = new Map<string, string>();
  for (const r of rows) {
    if (!r.source_id) continue;
    const at = r.retrieved_at.toISOString();
    const prev = map.get(r.source_id);
    if (!prev || at > prev) map.set(r.source_id, at);
  }
  return map;
}
