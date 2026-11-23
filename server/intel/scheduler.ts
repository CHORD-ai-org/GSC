import type { Database } from '../persistence/client.ts';
import type { Config } from '../config.ts';
import { log } from '../log.ts';
import {
  listDueSchedules, markScheduleRunning, finishScheduleRun, reclaimStaleSchedules, getSchedule,
} from '../repo/schedules.ts';
import { runFolderSchedule } from './adapters/folder.ts';
import { runWebSchedule } from './adapters/crawler.ts';

async function executeSchedule(
  db: Database,
  config: Config,
  sched: { id: string; kind: string; name: string; root_path: string; url_list: string; owner_id: string },
): Promise<Record<string, unknown>> {
  return sched.kind === 'folder'
    ? await runFolderSchedule(db, config, { id: sched.id, root_path: sched.root_path, owner_id: sched.owner_id })
    : await runWebSchedule(db, config, { id: sched.id, name: sched.name, url_list: sched.url_list, owner_id: sched.owner_id });
}

/** Console "run now": executes one schedule inline (the running lock keeps the
    worker tick from double-running it). */
export async function runScheduleNow(
  db: Database,
  config: Config,
  id: string,
): Promise<{ ok: boolean; detail: string }> {
  const sched = await getSchedule(db, id);
  if (!sched) return { ok: false, detail: 'not found' };
  if (sched.status === 'running') return { ok: false, detail: 'already running' };
  await markScheduleRunning(db, id);
  try {
    const result = await executeSchedule(db, config, sched);
    await finishScheduleRun(db, id);
    return { ok: true, detail: JSON.stringify(result) };
  } catch (e) {
    await finishScheduleRun(db, id);
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * LOCAL_SIM (cloud-isomorphic): the scheduler lives in the worker process, same
 * as the cloud deployment. One tick per minute; due = enabled + idle + interval
 * elapsed. Stuck 'running' schedules are reclaimed after 10 minutes.
 */
export async function runDueSchedules(db: Database, config: Config): Promise<{ ran: number; reclaimed: number }> {
  const reclaimed = await reclaimStaleSchedules(db);
  const due = await listDueSchedules(db);
  let ran = 0;
  for (const sched of due) {
    await markScheduleRunning(db, sched.id);
    try {
      const result = await executeSchedule(db, config, sched);
      await finishScheduleRun(db, sched.id);
      ran += 1;
      log('info', 'schedule run', {
        schedule: sched.id,
        kind: sched.kind,
        ...result,
      });
    } catch (e) {
      await finishScheduleRun(db, sched.id);
      log('warn', 'schedule run failed', { schedule: sched.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ran, reclaimed };
}
