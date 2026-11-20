import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { tagDefinitions, tagValues } from '../persistence/schema.ts';
import type {
  CreateTagDefinitionBody,
  CreateTagValueBody,
  TagDefinitionDTO,
  TagValueDTO,
} from '../../src/lib/tags.ts';

function defDTO(row: typeof tagDefinitions.$inferSelect): TagDefinitionDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_at: row.created_at.toISOString(),
  };
}

function valueDTO(row: typeof tagValues.$inferSelect): TagValueDTO {
  return {
    id: row.id,
    definition_id: row.definition_id,
    item_id: row.item_id ?? '',
    value: row.value,
    scope: row.scope,
    confirmed: row.confirmed === 1,
    owner_id: row.owner_id,
    created_at: row.created_at.toISOString(),
  };
}

export async function listTagDefinitions(db: Database): Promise<TagDefinitionDTO[]> {
  const rows = await db.select().from(tagDefinitions);
  return rows.map(defDTO);
}

export async function createTagDefinition(db: Database, body: CreateTagDefinitionBody): Promise<TagDefinitionDTO> {
  const id = `tag_${randomUUID()}`;
  await db.insert(tagDefinitions).values({
    id,
    name: body.name.trim(),
    description: body.description ?? '',
    created_at: new Date(),
  });
  return defDTO((await db.select().from(tagDefinitions).where(eq(tagDefinitions.id, id)).limit(1))[0]);
}

export async function getTagDefinition(db: Database, id: string): Promise<TagDefinitionDTO | undefined> {
  const [row] = await db.select().from(tagDefinitions).where(eq(tagDefinitions.id, id)).limit(1);
  return row ? defDTO(row) : undefined;
}

/** Returns undefined when the definition does not exist (assignment is refused upstream). */
export async function createTagValue(
  db: Database,
  body: CreateTagValueBody,
  ownerId: string,
): Promise<{ ok: true; value: TagValueDTO } | { ok: false; reason: 'no_definition' | 'conflict' }> {
  const def = await getTagDefinition(db, body.definition_id);
  if (!def) return { ok: false, reason: 'no_definition' };
  // Uniqueness (0007): the same (definition, item, value, scope) may be assigned once.
  const existing = await listTagValues(db, { itemId: body.item_id, definitionId: body.definition_id });
  const scope = body.scope ?? 'global';
  const value = body.value.trim();
  if (existing.some((v) => v.value === value && v.scope === scope && v.item_id === (body.item_id ?? ''))) {
    return { ok: false, reason: 'conflict' };
  }
  const id = `tv_${randomUUID()}`;
  await db.insert(tagValues).values({
    id,
    definition_id: body.definition_id,
    item_id: body.item_id ?? null,
    value,
    scope,
    confirmed: body.confirmed ? 1 : 0,
    owner_id: ownerId,
    created_at: new Date(),
  });
  return { ok: true, value: valueDTO((await db.select().from(tagValues).where(eq(tagValues.id, id)).limit(1))[0]) };
}

export async function listTagValues(
  db: Database,
  filter: { itemId?: string; definitionId?: string; ownerId?: string } = {},
): Promise<TagValueDTO[]> {
  const conditions = [];
  if (filter.itemId) conditions.push(eq(tagValues.item_id, filter.itemId));
  if (filter.definitionId) conditions.push(eq(tagValues.definition_id, filter.definitionId));
  if (filter.ownerId) conditions.push(eq(tagValues.owner_id, filter.ownerId));
  const rows = await db
    .select()
    .from(tagValues)
    .where(conditions.length ? and(...conditions) : undefined);
  return rows.map(valueDTO);
}

export async function setTagValueConfirmed(db: Database, id: string, confirmed: boolean, ownerId: string): Promise<TagValueDTO | undefined> {
  const [row] = await db.select().from(tagValues).where(eq(tagValues.id, id)).limit(1);
  if (!row || row.owner_id !== ownerId) return undefined;
  await db.update(tagValues).set({ confirmed: confirmed ? 1 : 0 }).where(eq(tagValues.id, id));
  return valueDTO((await db.select().from(tagValues).where(eq(tagValues.id, id)).limit(1))[0]);
}

export async function deleteTagValue(db: Database, id: string, ownerId: string): Promise<boolean> {
  const [row] = await db.select().from(tagValues).where(eq(tagValues.id, id)).limit(1);
  if (!row || row.owner_id !== ownerId) return false;
  await db.delete(tagValues).where(eq(tagValues.id, id));
  return true;
}
