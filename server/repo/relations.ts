import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { relations } from '../persistence/schema.ts';
import type { CreateRelationBody, RelationDTO, RelationKind } from '../../src/lib/relations.ts';
import { appendEvent } from './events.ts';
import { itemExists } from './items.ts';

type RelationRow = typeof relations.$inferSelect;

function toDTO(row: RelationRow): RelationDTO {
  return {
    id: row.id,
    kind: row.kind as RelationKind,
    from_id: row.from_id,
    to_id: row.to_id,
    note: row.note,
    created_at: row.created_at.toISOString(),
    created_by: row.created_by as RelationDTO['created_by'],
  };
}

export async function listRelations(
  db: Database,
  itemId: string,
): Promise<{ outgoing: RelationDTO[]; incoming: RelationDTO[] }> {
  const outgoing = await db.select().from(relations).where(eq(relations.from_id, itemId)).orderBy(asc(relations.created_at));
  const incoming = await db.select().from(relations).where(eq(relations.to_id, itemId)).orderBy(asc(relations.created_at));
  return { outgoing: outgoing.map(toDTO), incoming: incoming.map(toDTO) };
}

/** V2 (M2) relations projection: all edges touching a set of items (one batched query). */
export async function listRelationsForItems(db: Database, ids: string[]): Promise<RelationDTO[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(relations)
    .where(or(inArray(relations.from_id, ids), inArray(relations.to_id, ids)))
    .orderBy(asc(relations.created_at));
  return rows.map(toDTO);
}

export type CreateRelationResult =
  | { ok: true; relation: RelationDTO }
  | { ok: false; reason: 'not_found' | 'duplicate' | 'conflict'; message: string };

export async function createRelation(
  db: Database,
  body: CreateRelationBody,
): Promise<CreateRelationResult> {
  if (!(await itemExists(db, body.from_id)) || !(await itemExists(db, body.to_id))) {
    return { ok: false, reason: 'not_found', message: 'Relation endpoint not found' };
  }
  const duplicate = await db
    .select()
    .from(relations)
    .where(and(eq(relations.kind, body.kind), eq(relations.from_id, body.from_id), eq(relations.to_id, body.to_id)))
    .limit(1);
  if (duplicate.length > 0) {
    return { ok: false, reason: 'duplicate', message: 'This relation already exists' };
  }
  if (body.kind === 'derived_from') {
    const existing = await db
      .select()
      .from(relations)
      .where(and(eq(relations.kind, 'derived_from'), eq(relations.from_id, body.from_id)))
      .limit(1);
    if (existing.length > 0) {
      return { ok: false, reason: 'conflict', message: 'An object has at most one derived_from edge' };
    }
  }
  const id = `rel_${randomUUID()}`;
  const now = new Date();
  const created_by = body.created_by ?? 'user';
  await db.insert(relations).values({
    id,
    kind: body.kind,
    from_id: body.from_id,
    to_id: body.to_id,
    note: body.note ?? '',
    created_at: now,
    created_by,
  });
  await appendEvent(db, {
    item_id: body.from_id,
    at: now,
    actor: created_by,
    action: 'relation_added',
    detail: `${body.kind} → ${body.to_id}`,
  });
  await appendEvent(db, {
    item_id: body.to_id,
    at: now,
    actor: created_by,
    action: 'relation_added',
    detail: `incoming ${body.kind} ← ${body.from_id}`,
  });
  const [row] = await db.select().from(relations).where(eq(relations.id, id)).limit(1);
  return { ok: true, relation: toDTO(row) };
}
