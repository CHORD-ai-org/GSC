import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { schedules } from '../persistence/schema.ts';
import type { CreateScheduleBody, ScheduleDTO, UpdateScheduleBody } from '../../src/lib/schedules.ts';

function toDTO(row: typeof schedules.$inferSelect): ScheduleDTO {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as ScheduleDTO['kind'],
    root_path: row.root_path,
    url_list: row.url_list,
    interval_min: row.interval_min,
    enabled: row.enabled,
    status: row.status as ScheduleDTO['status'],
    last_run_at: row.last_run_at?.toISOString() ?? null,
    started_at: row.started_at?.toISOString() ?? null,
    owner_id: row.owner_id,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listSchedules(db: Database): Promise<ScheduleDTO[]> {
  const rows = await db.select().from(schedules).orderBy(asc(schedules.created_at));
  return rows.map(toDTO);
}

export async function getSchedule(db: Database, id: string): Promise<ScheduleDTO | undefined> {
  const [row] = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
  return row ? toDTO(row) : undefined;
}

export async function createSchedule(
  db: Database,
  input: CreateScheduleBody,
  ownerId: string,
): Promise<ScheduleDTO> {
  const now = new Date();
  const id = `sch_${randomUUID()}`;
  await db.insert(schedules).values({
    id,
    name: input.name,
    kind: input.kind,
    root_path: input.root_path ?? '',
    url_list: input.url_list ?? '',
    interval_min: input.interval_min ?? 5,
    enabled: input.enabled ?? true,
    status: 'idle',
    owner_id: ownerId,
    created_at: now,
    updated_at: now,
  });
  return (await getSchedule(db, id)) as ScheduleDTO;
}

export async function updateSchedule(
  db: Database,
  id: string,
  patch: UpdateScheduleBody,
): Promise<ScheduleDTO | undefined> {
  await db.update(schedules).set({
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
    ...(patch.root_path !== undefined ? { root_path: patch.root_path } : {}),
    ...(patch.url_list !== undefined ? { url_list: patch.url_list } : {}),
    ...(patch.interval_min !== undefined ? { interval_min: patch.interval_min } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    updated_at: new Date(),
  }).where(eq(schedules.id, id));
  return getSchedule(db, id);
}

export async function deleteSchedule(db: Database, id: string): Promise<boolean> {
  const removed = await db.delete(schedules).where(eq(schedules.id, id)).returning({ id: schedules.id });
  return removed.length > 0;
}

/** Due = enabled AND idle AND (never run OR interval elapsed). */
export async function listDueSchedules(db: Database): Promise<ScheduleDTO[]> {
  const rows = await db.select().from(schedules).where(and(
    eq(schedules.enabled, true),
    eq(schedules.status, 'idle'),
    or(
      isNull(schedules.last_run_at),
      sql`${schedules.last_run_at} <= now() - ${schedules.interval_min} * interval '1 minute'`,
    ),
  )).orderBy(asc(schedules.last_run_at));
  return rows.map(toDTO);
}

export async function markScheduleRunning(db: Database, id: string): Promise<void> {
  await db.update(schedules).set({ status: 'running', started_at: new Date(), updated_at: new Date() })
    .where(eq(schedules.id, id));
}

export async function finishScheduleRun(db: Database, id: string): Promise<void> {
  await db.update(schedules).set({ status: 'idle', last_run_at: new Date(), updated_at: new Date() })
    .where(eq(schedules.id, id));
}

export async function failScheduleRun(db: Database, id: string): Promise<void> {
  // keep the run recorded but release the lock so the next interval retries
  await db.update(schedules).set({ status: 'idle', last_run_at: new Date(), updated_at: new Date() })
    .where(eq(schedules.id, id));
}

/** Worker-interruption recovery: release schedules stuck 'running' (10 min). */
export async function reclaimStaleSchedules(db: Database, olderThanMs = 10 * 60_000): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const stale = await db.select({ id: schedules.id }).from(schedules)
    .where(and(eq(schedules.status, 'running'), lte(schedules.started_at, cutoff)));
  for (const row of stale) {
    await db.update(schedules).set({ status: 'idle', updated_at: new Date() })
      .where(eq(schedules.id, row.id));
  }
  return stale.length;
}
