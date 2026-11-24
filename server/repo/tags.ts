import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import {
  tagDefinitions, tagValues, metaGroups, metaTagGroups, assignmentParams, itemMetaParams,
} from '../persistence/schema.ts';
import type {
  CreateTagDefinitionBody,
  CreateTagValueBody,
  TagDefinitionDTO,
  TagValueDTO,
  TagParamDTO,
} from '../../src/lib/tags.ts';

/* ── META_TAG_SYSTEM_V1 (0014) additions: groups, multi-parent, params, filter ── */

export type MetaGroupDTO = { id: string; key: string; name: string; description: string; visibility_default: string };
export type { TagParamDTO };

export async function listMetaGroups(db: Database): Promise<MetaGroupDTO[]> {
  const rows = await db.select().from(metaGroups).orderBy(metaGroups.created_at);
  return rows.map((r) => ({
    id: r.id, key: r.key, name: r.name, description: r.description, visibility_default: r.visibility_default,
  }));
}

/** Attach groups (multi-parent) to a tag. */
export async function setTagGroups(db: Database, tagId: string, groupIds: string[]): Promise<void> {
  await db.delete(metaTagGroups).where(eq(metaTagGroups.tag_id, tagId));
  const now = new Date();
  for (const gid of groupIds) {
    await db.insert(metaTagGroups).values({ tag_id: tagId, group_id: gid, created_at: now }).onConflictDoNothing();
  }
}

export async function listTagGroupIds(db: Database): Promise<Map<string, string[]>> {
  const edges = await db.select().from(metaTagGroups);
  const map = new Map<string, string[]>();
  for (const e of edges) {
    const list = map.get(e.tag_id) ?? [];
    list.push(e.group_id);
    map.set(e.tag_id, list);
  }
  return map;
}

export async function listAssignmentParams(db: Database, assignmentId: string): Promise<TagParamDTO[]> {
  const rows = await db.select().from(assignmentParams).where(eq(assignmentParams.assignment_id, assignmentId));
  return rows.map((r) => ({ key: r.key, value: r.value, value_type: r.value_type }));
}

export async function setItemParams(db: Database, itemId: string, params: TagParamDTO[]): Promise<TagParamDTO[]> {
  const now = new Date();
  for (const p of params) {
    await db.insert(itemMetaParams).values({
      id: `mp_${randomUUID()}`,
      item_id: itemId,
      key: p.key,
      value: p.value,
      value_type: p.value_type || 'text',
      created_at: now,
    }).onConflictDoUpdate({
      target: [itemMetaParams.item_id, itemMetaParams.key],
      set: { value: p.value, value_type: p.value_type || 'text' },
    });
  }
  return getItemParams(db, itemId);
}

export async function getItemParams(db: Database, itemId: string): Promise<TagParamDTO[]> {
  const rows = await db.select().from(itemMetaParams).where(eq(itemMetaParams.item_id, itemId));
  return rows.map((r) => ({ key: r.key, value: r.value, value_type: r.value_type }));
}

/**
 * G5 筛选: item ids matching group / tag / item-level params.
 * Returns undefined when no filter is given (caller means "no restriction").
 */
export async function filterItemIds(
  db: Database,
  filter: { groupId?: string; tagId?: string; params?: Record<string, string> },
): Promise<string[] | undefined> {
  let ids: string[] | undefined;
  const intersect = (b: string[]) => {
    if (ids === undefined) ids = b;
    else {
      const set = new Set(b);
      ids = ids.filter((x) => set.has(x));
    }
  };

  if (filter.groupId) {
    const tagIds = (await db.select({ tag_id: metaTagGroups.tag_id }).from(metaTagGroups)
      .where(eq(metaTagGroups.group_id, filter.groupId))).map((r) => r.tag_id);
    const rows = tagIds.length
      ? await db.select({ item_id: tagValues.item_id }).from(tagValues).where(inArray(tagValues.definition_id, tagIds))
      : [];
    intersect(rows.map((r) => r.item_id).filter((v): v is string => !!v));
  }
  if (filter.tagId) {
    const rows = await db.select({ item_id: tagValues.item_id }).from(tagValues)
      .where(eq(tagValues.definition_id, filter.tagId));
    intersect(rows.map((r) => r.item_id).filter((v): v is string => !!v));
  }
  for (const [key, value] of Object.entries(filter.params ?? {})) {
    const rows = await db.select({ item_id: itemMetaParams.item_id }).from(itemMetaParams)
      .where(and(eq(itemMetaParams.key, key), eq(itemMetaParams.value, value)));
    intersect(rows.map((r) => r.item_id));
  }
  return ids;
}

/* ── existing tag CRUD below ── */

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
  if (body.group_ids?.length) await setTagGroups(db, id, body.group_ids);
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
  // META_TAG_V1: typed parameters on the assignment (打标参数)
  const now = new Date();
  for (const p of body.params ?? []) {
    await db.insert(assignmentParams).values({
      id: `ap_${randomUUID()}`,
      assignment_id: id,
      key: p.key,
      value: p.value,
      value_type: p.value_type || 'text',
      created_at: now,
    }).onConflictDoNothing();
  }
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
