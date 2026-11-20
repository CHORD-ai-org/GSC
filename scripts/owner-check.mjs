import { readConfig } from '../server/config.ts';
import { openDatabase } from '../server/persistence/client.ts';
const config = readConfig(process.env);
const handle = await openDatabase({ dataDir: config.pgliteDir });
const result = await handle.exec("select title, owner_id from items order by created_at desc limit 3");
for (const row of result[0].rows) console.log(row.title, '->', row.owner_id);
await handle.close();
