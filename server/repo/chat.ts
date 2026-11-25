import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { conversations, messages } from '../persistence/schema.ts';

export type ConversationDTO = { id: string; title: string; created_at: string };
export type MessageDTO = { id: string; conversation_id: string; role: string; content: string; created_at: string };

export async function createConversation(db: Database, title: string): Promise<ConversationDTO> {
  const id = `cnv_${randomUUID()}`;
  const now = new Date();
  await db.insert(conversations).values({ id, title: title.slice(0, 200), created_at: now });
  return { id, title, created_at: now.toISOString() };
}

export async function listConversations(db: Database): Promise<ConversationDTO[]> {
  const rows = await db.select().from(conversations).orderBy(desc(conversations.created_at));
  return rows.map((r) => ({ id: r.id, title: r.title, created_at: r.created_at.toISOString() }));
}

export async function getConversation(db: Database, id: string): Promise<ConversationDTO | undefined> {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return row ? { id: row.id, title: row.title, created_at: row.created_at.toISOString() } : undefined;
}

export async function addMessage(
  db: Database,
  conversationId: string,
  role: 'user' | 'agent',
  content: string,
): Promise<MessageDTO> {
  const id = `msg_${randomUUID()}`;
  const now = new Date();
  await db.insert(messages).values({ id, conversation_id: conversationId, role, content, created_at: now });
  return { id, conversation_id: conversationId, role, content, created_at: now.toISOString() };
}

export async function listMessages(db: Database, conversationId: string): Promise<MessageDTO[]> {
  const rows = await db.select().from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(messages.created_at);
  return rows.map((r) => ({
    id: r.id, conversation_id: r.conversation_id, role: r.role, content: r.content, created_at: r.created_at.toISOString(),
  }));
}
