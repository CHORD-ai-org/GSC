/**
 * SEMANTIC_TITLE_PLAN (batch A): outline node persistence. Nodes are derived
 * from content and re-derivable; titles are the durable part — agent/user
 * titles are NEVER overwritten by re-derivation (only rule titles refresh).
 */
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { outlineNodes } from '../persistence/schema.ts';
import { appendEvent } from './events.ts';
import { deriveOutline } from '../../src/lib/outline.ts';

export type OutlineNodeDTO = {
  id: string;
  path: string;
  level: number;
  start: number;
  end: number;
  title: string;
  nameOrigin: 'rule' | 'agent' | 'user';
};

function toDTO(row: typeof outlineNodes.$inferSelect): OutlineNodeDTO {
  return {
    id: row.id,
    path: row.path,
    level: row.level,
    start: row.start_offset,
    end: row.end_offset,
    title: row.title,
    nameOrigin: (row.name_origin as OutlineNodeDTO['nameOrigin']) ?? 'rule',
  };
}

export async function listOutline(db: Database, itemId: string): Promise<OutlineNodeDTO[]> {
  const rows = await db
    .select()
    .from(outlineNodes)
    .where(eq(outlineNodes.item_id, itemId))
    .orderBy(asc(outlineNodes.path));
  return rows.map(toDTO);
}

/**
 * Derive/refresh outline nodes for an item. Idempotent: existing paths get
 * offsets refreshed; agent/user titles survive; vanished paths are dropped
 * (a title dies with the text it described — documented policy).
 */
export async function ensureOutlineNodes(db: Database, itemId: string, content: string): Promise<OutlineNodeDTO[]> {
  const nodes = deriveOutline(content);
  const existing = await db.select().from(outlineNodes).where(eq(outlineNodes.item_id, itemId));
  const byPath = new Map(existing.map((row) => [row.path, row]));
  const now = new Date();
  const seen = new Set<string>();
  for (const node of nodes) {
    seen.add(node.path);
    const head = content.slice(node.start, node.end).trim().slice(0, 60);
    const hit = byPath.get(node.path);
    if (!hit) {
      await db.insert(outlineNodes).values({
        id: `out_${randomUUID()}`,
        item_id: itemId,
        path: node.path,
        level: node.level,
        start_offset: node.start,
        end_offset: node.end,
        title: node.ruleTitle,
        name_origin: 'rule',
        text_head: head,
        created_at: now,
        updated_at: now,
      });
      continue;
    }
    // agent titles are bound to their text: slice changed → back to rule
    // (re-generatable). User titles always survive.
    const textChanged = hit.text_head !== head;
    const title = hit.name_origin === 'rule' || (hit.name_origin === 'agent' && textChanged)
      ? node.ruleTitle
      : hit.title;
    const origin = hit.name_origin === 'agent' && textChanged ? 'rule' : hit.name_origin;
    if (
      hit.start_offset !== node.start || hit.end_offset !== node.end || hit.level !== node.level
      || hit.title !== title || hit.name_origin !== origin || hit.text_head !== head
    ) {
      await db
        .update(outlineNodes)
        .set({ level: node.level, start_offset: node.start, end_offset: node.end, title, name_origin: origin, text_head: head, updated_at: now })
        .where(eq(outlineNodes.id, hit.id));
    }
  }
  for (const row of existing) {
    if (!seen.has(row.path)) await db.delete(outlineNodes).where(eq(outlineNodes.id, row.id));
  }
  return listOutline(db, itemId);
}

/** Apply a confirmed/direct title to one outline node + history event. */
export async function applyOutlineTitle(
  db: Database,
  itemId: string,
  path: string,
  title: string,
  origin: 'agent' | 'user',
): Promise<boolean> {
  const [hit] = await db
    .select()
    .from(outlineNodes)
    .where(eq(outlineNodes.item_id, itemId))
    .orderBy(asc(outlineNodes.path))
    .then((rows) => rows.filter((row) => row.path === path));
  if (!hit) return false;
  // user titles win: a later proposal never overwrites a direct user rename
  if (hit.name_origin === 'user' && origin === 'agent') return false;
  await db
    .update(outlineNodes)
    .set({ title, name_origin: origin, updated_at: new Date() })
    .where(eq(outlineNodes.id, hit.id));
  await appendEvent(db, {
    item_id: itemId,
    actor: origin === 'agent' ? 'agent' : 'user',
    action: 'outline_title_set',
    detail: `path=${path} title=${title.slice(0, 60)}`,
  });
  return true;
}
