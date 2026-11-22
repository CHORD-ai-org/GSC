import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { events } from '../persistence/schema.ts';
import type { EventDTO, EventAction } from '../../src/lib/events.ts';

export async function appendEvent(
  db: Database,
  input: Omit<EventDTO, 'id' | 'at'> & { at?: Date },
): Promise<void> {
  await db.insert(events).values({
    id: `evt_${randomUUID()}`,
    item_id: input.item_id,
    at: input.at ?? new Date(),
    actor: input.actor,
    action: input.action,
    detail: input.detail,
  });
}

export async function listEvents(db: Database, itemId: string): Promise<EventDTO[]> {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.item_id, itemId))
    .orderBy(desc(events.at));
  return rows.map((row) => ({
    id: row.id,
    item_id: row.item_id,
    at: row.at.toISOString(),
    actor: row.actor as EventDTO['actor'],
    action: row.action as EventAction,
    detail: row.detail,
  }));
}
