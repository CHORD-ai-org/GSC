import { resolve } from 'node:path';

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export type Config = {
  port: number;
  dbAdapter: 'pglite';
  pgliteDir: string;
  storageDir: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmTimeoutMs: number;
  llmMaxRetries: number;
  llmRetryBaseMs: number;
  corsOrigins: string[];
  allowPrivateIngest: boolean;
  authRequired: boolean;
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
    // Xiaomi MiMo Token Plan (OpenAI-compatible, tp- keys) — CN cluster by default.
    // Note: tp-* keys only work on token-plan-* hosts, not api.xiaomimimo.com.
    llmBaseUrl: env.GSC_LLM_BASE_URL ?? 'https://token-plan-cn.xiaomimimo.com/v1',
    llmApiKey: env.GSC_LLM_API_KEY ?? '',
    llmModel: env.GSC_LLM_MODEL ?? 'mimo-v2.6-flash',
    // INTEGRATION_HARDENING P0-A: bound every provider call (no hung requests)
    // and retry transient failures with exponential backoff.
    llmTimeoutMs: positiveInt(env.GSC_LLM_TIMEOUT_MS, 30000),
    llmMaxRetries: positiveInt(env.GSC_LLM_MAX_RETRIES, 2),
    llmRetryBaseMs: positiveInt(env.GSC_LLM_RETRY_BASE_MS, 400),
    // O1-7: explicit CORS allowlist; empty = same-origin only (browser blocks cross-origin)
    corsOrigins: (env.GSC_CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    // O1-3: dev/test escape hatch for loopback ingestion; production must stay off
    allowPrivateIngest: env.GSC_INGEST_ALLOW_PRIVATE === '1',
    authRequired: env.GSC_AUTH_REQUIRED === '1',
  };
}
