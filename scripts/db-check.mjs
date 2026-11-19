import { readConfig } from '../server/config.ts';
import { openDatabase } from '../server/persistence/client.ts';

const config = readConfig(process.env);
const handle = await openDatabase({ dataDir: config.pgliteDir });
const result = await handle.exec(
  "select table_name from information_schema.tables where table_schema='public' order by table_name",
);
const names = result[0]?.rows?.map((row) => row.table_name) ?? [];
process.stdout.write(`[gsc-db-check] ${names.length} tables: ${names.join(', ')}\n`);
if (names.length !== 6) process.exitCode = 1;
await handle.close();
