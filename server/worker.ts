/**
 * GSC worker (cloud-isomorphic topology): background jobs live HERE, not in the
 * API process. Same image as api, different command — exactly how the cloud
 * deployment splits. Carries: capture worker (queue drain), source sync
 * scheduler (T402), and the LOCAL_SIM schedules scheduler (folder/crawl).
 */
import { dirname } from 'node:path';
import { readConfig } from './config.ts';
import { getDatabase } from './persistence/client.ts';
import { migrate } from './persistence/migrate.ts';
import { log } from './log.ts';
import { runCaptureWorker } from './intel/pipeline.ts';
import { startSyncScheduler } from './sync/scheduler.ts';
import { runDueSchedules } from './intel/scheduler.ts';

const config = readConfig(process.env);
const handle = await getDatabase({ dataDir: config.pgliteDir, adapter: config.dbAdapter, dsn: config.pgDsn });
await migrate();

// Capture queue drain + interruption recovery (same cadence as the API's dev mode).
setInterval(() => {
  void runCaptureWorker(handle.db, config).catch((e) => {
    log('error', 'capture worker error', { error: e instanceof Error ? e.message : String(e) });
  });
}, 3_000);

// T402 source sync scheduler (daily-frequency sources).
startSyncScheduler(handle.db, config, dirname(config.pgliteDir));

// LOCAL_SIM schedules: folder scans + web crawls, once a minute.
setInterval(() => {
  void runDueSchedules(handle.db, config).catch((e) => {
    log('error', 'scheduler tick error', { error: e instanceof Error ? e.message : String(e) });
  });
}, 60_000);

log('info', '[gsc-worker] started', { db: handle.kind, pglite: config.pgliteDir, crawl: config.crawlDir });
