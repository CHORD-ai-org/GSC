import { createServer } from 'node:http';
import { dirname } from 'node:path';
import { readConfig } from './config.ts';
import { getDatabase } from './persistence/client.ts';
import { migrate } from './persistence/migrate.ts';
import { createApiRouter } from './router.ts';
import { runCaptureWorker } from './intel/pipeline.ts';
import { startSyncScheduler } from './sync/scheduler.ts';

const config = readConfig(process.env);
const handle = await getDatabase({ dataDir: config.pgliteDir, adapter: config.dbAdapter, dsn: config.pgDsn });
await migrate();
const router = createApiRouter(config, handle.db);

// Capture worker (Web Intelligence §6.3): background drain + interruption recovery.
// Runs every 3s — reclaims stale tasks and processes any queued captures
// independently of the request lifecycle. Idempotent, so overlap is harmless.
setInterval(() => {
  void runCaptureWorker(handle.db, config).catch((e) => {
    process.stderr.write(`[gsc-api] capture worker error: ${e instanceof Error ? e.message : e}\n`);
  });
}, 3_000);

// Source sync scheduler (T402): honours source.frequency (daily) and syncs due
// sources every 5 min without user action. 'manual' sources are never auto-run.
startSyncScheduler(handle.db, config, dirname(config.pgliteDir));

createServer((req, res) =>
  router(req, res, () => {
    res.statusCode = 404;
    res.end('Not found');
  }),
).listen(config.port, '127.0.0.1', () => {
  process.stdout.write(`[gsc-api] http://127.0.0.1:${config.port} · pglite ${config.pgliteDir}\n`);
});
