import { resolve } from 'node:path';

export type Config = {
  port: number;
  dbAdapter: 'pglite';
  pgliteDir: string;
  storageDir: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
};

export function readConfig(env: NodeJS.ProcessEnv): Config {
  const port = Number(env.PORT ?? 8788);
  const portValue = Number.isInteger(port) && port > 0 && port < 65536 ? port : 8788;
  const adapter = env.DB_ADAPTER ?? 'pglite';
  if (adapter !== 'pglite') {
    throw new Error(`Unsupported DB_ADAPTER: ${adapter}. Phase 03 uses local PGlite (D-026).`);
  }
  return {
    port: portValue,
    dbAdapter: 'pglite',
    pgliteDir: resolve(env.PGLITE_DIR ?? './.data/pglite'),
    storageDir: resolve(env.STORAGE_DIR ?? './data/files'),
    llmBaseUrl: env.GSC_LLM_BASE_URL ?? 'https://api.deepseek.com/v1',
    llmApiKey: env.GSC_LLM_API_KEY ?? '',
    llmModel: env.GSC_LLM_MODEL ?? 'deepseek-chat',
  };
}
