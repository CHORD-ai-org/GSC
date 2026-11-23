import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { items, spatialLayouts } from '../persistence/schema.ts';

export type SpatialEntry = { item_id: string; x: number; y: number };

/** V4 (M4) kept-tier layout read (owner + page scoped). */
export async function getSpatialLayout(
  db: Database,
  ownerId: string,
  page: string,
): Promise<SpatialEntry[]> {
  const rows = await db
    .select({ item_id: spatialLayouts.item_id, x: spatialLayouts.x, y: spatialLayouts.y })
    .from(spatialLayouts)
    .where(and(eq(spatialLayouts.owner_id, ownerId), eq(spatialLayouts.page, page)));
  return rows;
}

/**
 * V4 (M4) kept-tier layout write: upsert per-row coordinates.
 * `replace` clears the owner+page scope first. Rows pointing at missing items are
 * dropped (best-effort layout must never break on a stale id). Returns rows saved.
 */
export async function putSpatialLayout(
  db: Database,
  ownerId: string,
  page: string,
  entries: SpatialEntry[],
  replace = false,
): Promise<number> {
  const capped = entries.slice(0, 500);
  const ids = [...new Set(capped.map((e) => e.item_id))];
  const existing = ids.length > 0
    ? await db.select({ id: items.id }).from(items).where(inArray(items.id, ids))
    : [];
  const known = new Set(existing.map((r) => r.id));
  const valid = capped.filter((e) => known.has(e.item_id));
  await db.transaction(async (tx) => {
    if (replace) {
      await tx.delete(spatialLayouts)
        .where(and(eq(spatialLayouts.owner_id, ownerId), eq(spatialLayouts.page, page)));
    }
    for (const e of valid) {
      await tx.insert(spatialLayouts).values({
        item_id: e.item_id,
        page,
        owner_id: ownerId,
        x: e.x,
        y: e.y,
      }).onConflictDoUpdate({
        target: [spatialLayouts.item_id, spatialLayouts.page, spatialLayouts.owner_id],
        set: { x: e.x, y: e.y },
      });
    }
  });
  return valid.length;
}
