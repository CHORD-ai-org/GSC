/**
 * Capture tasks (Web Intelligence §6): minimal PostgreSQL-backed background
 * queue. No message broker. Claim is a guarded status flip; stale claims are
 * reclaimed so an interrupted worker recovers cleanly.
 */
import { randomUUID } from 'node:crypto';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { captureTasks } from '../persistence/schema.ts';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TaskRow = typeof captureTasks.$inferSelect;

export async function createTask(
  db: Database,
  input: { sourceId?: string | null; kind: string; url: string },
): Promise<TaskRow> {
  const id = `tsk_${randomUUID()}`;
  const now = new Date();
  await db.insert(captureTasks).values({
    id,
    source_id: input.sourceId ?? null,
    kind: input.kind,
    url: input.url,
    status: 'pending',
    stage: 'queued',
    retry_count: 0,
    last_error: '',
    created_at: now,
    updated_at: now,
    claimed_at: null,
    completed_at: null,
  });
  return (await getTask(db, id)) as TaskRow;
}

export async function getTask(db: Database, id: string): Promise<TaskRow | undefined> {
  const [row] = await db.select().from(captureTasks).where(eq(captureTasks.id, id)).limit(1);
  return row;
}

export async function listTasks(db: Database, limit = 50): Promise<TaskRow[]> {
  return db.select().from(captureTasks).limit(limit);
}

/** Atomically claim the oldest pending task (guarded flip: only if still pending). */
export async function claimNextTask(db: Database): Promise<TaskRow | undefined> {
  /* P1 hygiene: exponential backoff gate using retry_count (0s/60s/120s/180s) —
     retried tasks sit out their window before being claimed again. */
  const [pending] = await db
    .select()
    .from(captureTasks)
    .where(and(
      eq(captureTasks.status, 'pending'),
      sql`${captureTasks.updated_at} <= now() - ${captureTasks.retry_count} * interval '1 second' * 60`,
    ))
    .orderBy(asc(captureTasks.updated_at))
    .limit(1);
  if (!pending) return undefined;
  const now = new Date();
  await db
    .update(captureTasks)
    .set({ status: 'processing', stage: 'fetching', claimed_at: now, updated_at: now })
    .where(and(eq(captureTasks.id, pending.id), eq(captureTasks.status, 'pending')));
  return getTask(db, pending.id);
}

export async function updateTask(
  db: Database,
  id: string,
  patch: { status?: TaskStatus; stage?: string; error?: string; completed?: boolean; retry_count?: number },
): Promise<void> {
  const now = new Date();
  await db
    .update(captureTasks)
    .set({
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.stage ? { stage: patch.stage } : {}),
      ...(patch.error !== undefined ? { last_error: patch.error } : {}),
      ...(patch.completed ? { completed_at: now } : {}),
      ...(patch.retry_count !== undefined ? { retry_count: patch.retry_count } : {}),
      updated_at: now,
    })
    .where(eq(captureTasks.id, id));
}

/** Worker-interruption recovery: return stale in-flight tasks to the queue. */
export async function reclaimStale(db: Database, olderThanMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const stale = await db
    .select({ id: captureTasks.id })
    .from(captureTasks)
    .where(and(eq(captureTasks.status, 'processing'), lte(captureTasks.claimed_at, cutoff)));
  for (const row of stale) {
    await db
      .update(captureTasks)
      .set({ status: 'pending', stage: 'queued', updated_at: new Date() })
      .where(eq(captureTasks.id, row.id));
  }
  return stale.length;
}
