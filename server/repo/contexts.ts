import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { contextMembers, contexts } from '../persistence/schema.ts';
import type {
  ContextDTO,
  ContextDetailDTO,
  CreateContextBody,
  UpdateContextBody,
} from '../../src/lib/contexts.ts';
import { itemExists } from './items.ts';

type ContextRow = typeof contexts.$inferSelect;

export async function contextOwner(db: Database, id: string): Promise<string | undefined> {
  const [row] = await db.select({ owner_id: contexts.owner_id }).from(contexts).where(eq(contexts.id, id)).limit(1);
  return row?.owner_id;
}

function toDTO(row: ContextRow): ContextDTO {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    scope: row.scope,
    purpose: row.purpose,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listContexts(db: Database): Promise<ContextDTO[]> {
  const rows = await db.select().from(contexts).orderBy(asc(contexts.created_at));
  return rows.map(toDTO);
}

export async function getContext(db: Database, id: string): Promise<ContextDetailDTO | undefined> {
  const [row] = await db.select().from(contexts).where(eq(contexts.id, id)).limit(1);
  if (!row) return undefined;
  const members = await db
    .select({ item_id: contextMembers.item_id })
    .from(contextMembers)
    .where(eq(contextMembers.context_id, id))
    .orderBy(asc(contextMembers.position), asc(contextMembers.added_at));
  return { ...toDTO(row), member_ids: members.map((m) => m.item_id) };
}

export async function deleteContext(db: Database, id: string): Promise<boolean> {
  const [current] = await db.select().from(contexts).where(eq(contexts.id, id)).limit(1);
  if (!current) return false;
  await db.delete(contexts).where(eq(contexts.id, id));
  return true;
}

export async function createContext(db: Database, body: CreateContextBody, ownerId?: string): Promise<ContextDTO> {
  const id = `ctx_${randomUUID()}`;
  const now = new Date();
  await db.insert(contexts).values({
    id,
    title: body.title,
    subject: body.subject,
    scope: body.scope,
    purpose: body.purpose,
    owner_id: ownerId ?? 'usr_local',
    created_at: now,
    updated_at: now,
  });
  return toDTO((await db.select().from(contexts).where(eq(contexts.id, id)).limit(1))[0]);
}

export async function updateContext(
  db: Database,
  id: string,
  body: UpdateContextBody,
): Promise<ContextDTO | undefined> {
  const current = await getContext(db, id);
  if (!current) return undefined;
  await db
    .update(contexts)
    .set({
      title: body.title ?? current.title,
      subject: body.subject ?? current.subject,
      scope: body.scope ?? current.scope,
      purpose: body.purpose ?? current.purpose,
      updated_at: new Date(),
    })
    .where(eq(contexts.id, id));
  const [row] = await db.select().from(contexts).where(eq(contexts.id, id)).limit(1);
  return toDTO(row);
}

export type ContextMemberResult =
  | { ok: true; context: ContextDetailDTO }
  | { ok: false; reason: 'not_found' | 'duplicate'; message: string };

export async function addContextMember(
  db: Database,
  contextId: string,
  itemId: string,
): Promise<ContextMemberResult> {
  const context = await getContext(db, contextId);
  if (!context) return { ok: false, reason: 'not_found', message: 'Context not found' };
  if (!(await itemExists(db, itemId))) return { ok: false, reason: 'not_found', message: 'Item not found' };
  if (context.member_ids.includes(itemId)) {
    return { ok: false, reason: 'duplicate', message: 'Item is already a member' };
  }
  await db.insert(contextMembers).values({
    context_id: contextId,
    item_id: itemId,
    added_at: new Date(),
    position: context.member_ids.length,
  });
  await db.update(contexts).set({ updated_at: new Date() }).where(eq(contexts.id, contextId));
  return { ok: true, context: (await getContext(db, contextId))! };
}

export async function removeContextMember(
  db: Database,
  contextId: string,
  itemId: string,
): Promise<ContextMemberResult> {
  const context = await getContext(db, contextId);
  if (!context) return { ok: false, reason: 'not_found', message: 'Context not found' };
  if (!context.member_ids.includes(itemId)) {
    return { ok: false, reason: 'not_found', message: 'Item is not a member' };
  }
  await db
    .delete(contextMembers)
    .where(and(eq(contextMembers.context_id, contextId), eq(contextMembers.item_id, itemId)));
  const remaining = context.member_ids.filter((id) => id !== itemId);
  for (const [index, id] of remaining.entries()) {
    await db
      .update(contextMembers)
      .set({ position: index })
      .where(and(eq(contextMembers.context_id, contextId), eq(contextMembers.item_id, id)));
  }
  await db.update(contexts).set({ updated_at: new Date() }).where(eq(contexts.id, contextId));
  return { ok: true, context: (await getContext(db, contextId))! };
}
