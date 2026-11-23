import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, isNotNull, isNull, lt, or } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { events, itemContent, items } from '../persistence/schema.ts';
import type {
  CreateItemBody,
  Domain,
  ItemDTO,
  ItemFields,
  ItemType,
  Origin,
  Status,
  UpdateItemBody,
} from '../../src/lib/items.ts';
import { defaultStatus, fieldKeysFor, itemTextForFilter } from '../../src/lib/items.ts';

type ItemRow = typeof items.$inferSelect;
type ContentRow = typeof itemContent.$inferSelect;

const fieldColumns = [
  'content_text', 'author', 'locator', 'filename', 'storage_ref', 'mime_type',
  'captured_at', 'measured_at', 'definition', 'notes', 'claim', 'reasoning',
  'name', 'steps', 'intended_use', 'statement', 'alternatives', 'consequences',
  'source_item_id',
] as const satisfies readonly (keyof ItemFields)[];

export function toDTO(row: ItemRow, content?: ContentRow): ItemDTO {
  const fields: ItemFields = {};
  if (content) {
    for (const key of fieldColumns) {
      const value = content[key];
      if (typeof value === 'string') fields[key] = value;
    }
  }
  return {
    id: row.id,
    type: row.type as ItemType,
    title: row.title,
    domain: row.domain as Domain,
    origin: row.origin as Origin,
    source_label: row.source_label,
    status: row.status as Status,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    fields,
  };
}

function idFor(type: ItemType): string {
  const prefix = type.startsWith('raw.') ? 'raw' : 'obj';
  return `${prefix}_${randomUUID()}`;
}

export type ItemPage = { items: ItemDTO[]; next_cursor?: string; total: number };

function encodeCursor(updatedAt: Date | string, id: string): string {
  return Buffer.from(`${new Date(updatedAt).toISOString()}|${id}`).toString('base64url');
}

function decodeCursor(cursor: string): { at: string; id: string } | undefined {
  try {
    const [at, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    if (!at || !id) return undefined;
    return { at, id };
  } catch {
    return undefined;
  }
}

export async function listItemsPaged(
  db: Database,
  filters: { type?: string; domain?: string; q?: string; cursor?: string; limit?: number } = {},
): Promise<ItemPage> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const conditions = [isNull(items.deleted_at)];
  if (filters.type) conditions.push(eq(items.type, filters.type));
  if (filters.domain) conditions.push(eq(items.domain, filters.domain));
  const cursor = filters.cursor ? decodeCursor(filters.cursor) : undefined;
  if (cursor) {
    const keyset = or(
      lt(items.updated_at, new Date(cursor.at)),
      and(eq(items.updated_at, new Date(cursor.at)), lt(items.id, cursor.id)),
    );
    if (keyset) conditions.push(keyset);
  }
  const rows = await db
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(desc(items.updated_at), desc(items.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const contents = await db.select().from(itemContent);
  const contentById = new Map(contents.map((c) => [c.item_id, c]));
  let all = page.map((row) => toDTO(row, contentById.get(row.id)));
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    all = all.filter((item) => itemTextForFilter(item).includes(needle));
  }
  const [{ rowCount }] = await db.select({ rowCount: count() }).from(items).where(isNull(items.deleted_at));
  const last = page[page.length - 1];
  return {
    items: all,
    next_cursor: hasMore && last ? encodeCursor(last.updated_at, last.id) : undefined,
    total: Number(rowCount),
  };
}

export async function listItems(
  db: Database,
  filters: { type?: string; domain?: string; q?: string } = {},
): Promise<ItemDTO[]> {
  const conditions = [isNull(items.deleted_at)];
  if (filters.type) conditions.push(eq(items.type, filters.type));
  if (filters.domain) conditions.push(eq(items.domain, filters.domain));
  const rows = await db
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(desc(items.updated_at));
  // join typed content in memory so `fields` and the keyword filter see it (D-020)
  const contents = await db.select().from(itemContent);
  const contentById = new Map(contents.map((c) => [c.item_id, c]));
  const all = rows.map((row) => toDTO(row, contentById.get(row.id)));
  if (!filters.q) return all;
  const needle = filters.q.toLowerCase();
  return all.filter((item) => itemTextForFilter(item).includes(needle));
}

export async function getItem(db: Database, id: string): Promise<ItemDTO | undefined> {
  /* T203: soft-deleted items are hidden from normal access (trash only) */
  const [row] = await db.select().from(items).where(and(eq(items.id, id), isNull(items.deleted_at))).limit(1);
  if (!row) return undefined;
  const [content] = await db.select().from(itemContent).where(eq(itemContent.item_id, id)).limit(1);
  return toDTO(row, content);
}

export async function createItem(
  db: Database,
  body: CreateItemBody,
  prepareFields?: (id: string, fields: ItemFields) => Promise<ItemFields>,
  ownerId?: string,
): Promise<ItemDTO> {
  const id = idFor(body.type);
  const now = new Date();
  // File/storage preparation happens before the transaction: it is not transactional.
  const rawFields = body.fields ?? {};
  const fields = prepareFields ? await prepareFields(id, rawFields) : rawFields;
  // O1-4: items + content + events commit or roll back together.
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    await t.insert(items).values({
      id,
      type: body.type,
      title: body.title,
      domain: body.domain ?? 'knowledge',
      origin: body.origin ?? 'user',
      source_label: body.source_label ?? '',
      status: defaultStatus(body.type),
      owner_id: ownerId ?? 'usr_local',
      created_at: now,
      updated_at: now,
    });
    const content: Record<string, string | null> = { item_id: id };
    for (const key of fieldKeysFor(body.type)) content[key] = fields[key] ?? null;
    await t.insert(itemContent).values(content as typeof itemContent.$inferInsert);
    await t.insert(events).values({
      id: `evt_${randomUUID()}`,
      item_id: id,
      at: now,
      actor: body.origin ?? 'user',
      action: 'created',
      detail: `${body.type} created`,
    });
  });
  return getItem(db, id) as Promise<ItemDTO>;
}

export async function updateItem(
  db: Database,
  id: string,
  body: UpdateItemBody,
): Promise<ItemDTO | undefined> {
  const current = await getItem(db, id);
  if (!current) return undefined;
  const now = new Date();
  await db
    .update(items)
    .set({
      title: body.title ?? current.title,
      domain: body.domain ?? current.domain,
      origin: body.origin ?? current.origin,
      source_label: body.source_label ?? current.source_label,
      status: (body.status ?? current.status) as Status,
      updated_at: now,
    })
    .where(eq(items.id, id));

  const editable = fieldKeysFor(current.type);
  const patch: Record<string, string | null> = {};
  for (const key of editable) {
    if (body.fields && key in body.fields) patch[key] = body.fields[key] ?? null;
  }
  if (Object.keys(patch).length > 0) {
    await db.update(itemContent).set(patch).where(eq(itemContent.item_id, id));
  }
  await db.insert(events).values({
    id: `evt_${randomUUID()}`,
    item_id: id,
    at: now,
    actor: 'user',
    action: body.status && body.status !== current.status ? 'status_changed' : 'updated',
    detail: Object.keys(body).length > 0
      ? Object.entries(body).flatMap(([k, v]) =>
          k === 'fields' && v && typeof v === 'object' ? Object.keys(v as object).map((fk) => `fields.${fk}`) : [k],
        ).join(', ')
      : 'updated',
  });
  return getItem(db, id);
}

export async function itemExists(db: Database, id: string): Promise<boolean> {
  const [row] = await db.select({ id: items.id }).from(items).where(eq(items.id, id)).limit(1);
  return Boolean(row);
}

export async function deleteItem(db: Database, id: string): Promise<boolean> {
  /* T203 soft delete: row stays (relations/events preserved for restore) */
  const [row] = await db.select({ id: items.id }).from(items).where(and(eq(items.id, id), isNull(items.deleted_at))).limit(1);
  if (!row) return false;
  await db.update(items).set({ deleted_at: new Date() }).where(eq(items.id, id));
  return true;
}

export async function restoreItem(db: Database, id: string): Promise<boolean> {
  const [row] = await db.select({ id: items.id }).from(items).where(eq(items.id, id)).limit(1);
  if (!row) return false;
  await db.update(items).set({ deleted_at: null }).where(eq(items.id, id));
  return true;
}

export async function purgeItem(db: Database, id: string): Promise<boolean> {
  const existing = await itemExists(db, id);
  if (!existing) return false;
  // hard delete: cascades item_content, relations, events, context_members
  await db.delete(items).where(eq(items.id, id));
  return true;
}

export async function listDeletedItems(db: Database): Promise<ItemDTO[]> {
  const rows = await db.select().from(items).where(isNotNull(items.deleted_at)).orderBy(desc(items.deleted_at));
  const contents = await db.select().from(itemContent);
  const contentById = new Map(contents.map((c) => [c.item_id, c]));
  return rows.map((row) => toDTO(row, contentById.get(row.id)));
}
