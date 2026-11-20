/* Mint a PAT-style API token (D-058). Usage: node scripts/create-token.mjs <name> [read|rw] */
import { dirname, resolve } from 'node:path';
import { createApiToken } from '../server/storage/tokens.ts';

const [, , name = 'default', scopeArg = 'rw'] = process.argv;
const scope = scopeArg === 'read' ? 'read' : 'rw';
const dataDir = resolve(process.env.PGLITE_DIR ?? './.data/pglite');
const { id, token } = createApiToken(dirname(dataDir), name, scope);
process.stdout.write(`id: ${id}\nname: ${name}\nscope: ${scope}\ntoken: ${token}\n\nStore this token now — it is not recoverable.\n`);
