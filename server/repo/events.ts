import { randomUUID } from 'node:crypto';
import { desc, eq, inArray, sql } from 'drizzle-orm';
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

/** V1 engagement traces: per-item user/agent activity counts (one batched query, zero N+1). */
export async function activityCountsByItem(
  db: Database,
  ids: string[],
): Promise<Map<string, { user: number; agent: number }>> {
  const out = new Map<string, { user: number; agent: number }>();
  if (ids.length === 0) return out;
  const rows = await db
    .select({ item_id: events.item_id, actor: events.actor, n: sql<number>`count(*)::int` })
    .from(events)
    .where(inArray(events.item_id, ids))
    .groupBy(events.item_id, events.actor);
  for (const row of rows) {
    const slot = out.get(row.item_id) ?? { user: 0, agent: 0 };
    if (row.actor === 'user') slot.user += row.n;
    else if (row.actor === 'agent') slot.agent += row.n;
    out.set(row.item_id, slot);
  }
  return out;
}
