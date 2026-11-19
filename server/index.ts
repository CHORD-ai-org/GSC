import { createServer } from 'node:http';
import { readConfig } from './config.ts';
import { getDatabase } from './persistence/client.ts';
import { migrate } from './persistence/migrate.ts';
import { createApiRouter } from './router.ts';

const config = readConfig(process.env);
const handle = await getDatabase(config.pgliteDir);
await migrate();
const router = createApiRouter(config, handle.db);

createServer((req, res) =>
  router(req, res, () => {
    res.statusCode = 404;
    res.end('Not found');
  }),
).listen(config.port, '127.0.0.1', () => {
  process.stdout.write(`[gsc-api] http://127.0.0.1:${config.port} · pglite ${config.pgliteDir}\n`);
});
