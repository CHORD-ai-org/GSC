import { randomUUID } from 'node:crypto';
import { and, desc, eq, like, or } from 'drizzle-orm';
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
import { defaultStatus, fieldKeysFor } from '../../src/lib/items.ts';

type ItemRow = typeof items.$inferSelect;
type ContentRow = typeof itemContent.$inferSelect;

const fieldColumns = [
  'content_text', 'author', 'locator', 'filename', 'storage_ref', 'mime_type',
  'captured_at', 'measured_at', 'definition', 'notes', 'claim', 'reasoning',
  'name', 'steps', 'intended_use', 'statement', 'alternatives', 'consequences',
  'source_item_id',
] as const satisfies readonly (keyof ItemFields)[];

function toDTO(row: ItemRow, content?: ContentRow): ItemDTO {
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

export async function listItems(
  db: Database,
  filters: { type?: string; domain?: string; q?: string } = {},
): Promise<ItemDTO[]> {
  const conditions = [];
  if (filters.type) conditions.push(eq(items.type, filters.type));
  if (filters.domain) conditions.push(eq(items.domain, filters.domain));
  if (filters.q) {
    const pattern = `%${filters.q.toLowerCase()}%`;
    conditions.push(or(like(items.title, pattern), like(items.source_label, pattern)));
  }
  const rows = await db
    .select()
    .from(items)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(items.updated_at));
  return rows.map((row) => toDTO(row));
}

export async function getItem(db: Database, id: string): Promise<ItemDTO | undefined> {
  const [row] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (!row) return undefined;
  const [content] = await db.select().from(itemContent).where(eq(itemContent.item_id, id)).limit(1);
  return toDTO(row, content);
}

export async function createItem(
  db: Database,
  body: CreateItemBody,
  prepareFields?: (id: string, fields: ItemFields) => Promise<ItemFields>,
): Promise<ItemDTO> {
  const id = idFor(body.type);
  const now = new Date();
  await db.insert(items).values({
    id,
    type: body.type,
    title: body.title,
    domain: body.domain ?? 'knowledge',
    origin: body.origin ?? 'user',
    source_label: body.source_label ?? '',
    status: defaultStatus(body.type),
    created_at: now,
    updated_at: now,
  });
  const rawFields = body.fields ?? {};
  const fields = prepareFields ? await prepareFields(id, rawFields) : rawFields;
  const content: Record<string, string | null> = { item_id: id };
  for (const key of fieldKeysFor(body.type)) content[key] = fields[key] ?? null;
  await db.insert(itemContent).values(content as typeof itemContent.$inferInsert);
  await db.insert(events).values({
    id: `evt_${randomUUID()}`,
    item_id: id,
    at: now,
    actor: body.origin ?? 'user',
    action: 'created',
    detail: `${body.type} created`,
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
    detail: Object.keys(body).length > 0 ? `${Object.keys(body).join(', ')} updated` : 'updated',
  });
  return getItem(db, id);
}

export async function itemExists(db: Database, id: string): Promise<boolean> {
  const [row] = await db.select({ id: items.id }).from(items).where(eq(items.id, id)).limit(1);
  return Boolean(row);
}
