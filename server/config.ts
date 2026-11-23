import { resolve } from 'node:path';

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export type Config = {
  port: number;
  /** DB-1: 'pglite' (embedded default) or 'postgres' (deployment adapter). */
  dbAdapter: 'pglite' | 'postgres';
  pgliteDir: string;
  /** DB-1: DSN for the postgres adapter (DATABASE_URL). */
  pgDsn: string;
  /** SEC-2: production profile gates dev/test escape hatches at startup. */
  env: 'development' | 'production';
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
  if (adapter !== 'pglite' && adapter !== 'postgres') {
    throw new Error(`Unsupported DB_ADAPTER: ${adapter}. Use 'pglite' (local) or 'postgres' (deployment, D-004).`);
  }
  const pgDsn = env.DATABASE_URL ?? '';
  if (adapter === 'postgres' && !pgDsn) {
    throw new Error('DB_ADAPTER=postgres requires DATABASE_URL (e.g. postgres://user:pass@host:5432/gsc).');
  }
  const runtimeEnv: Config['env'] = env.GSC_ENV === 'production' ? 'production' : 'development';
  // SEC-2: fail fast — the private-ingest escape hatch must never ship to prod.
  if (runtimeEnv === 'production' && env.GSC_INGEST_ALLOW_PRIVATE === '1') {
    throw new Error('GSC_INGEST_ALLOW_PRIVATE=1 is refused with GSC_ENV=production (dev/test escape hatch only).');
  }
  return {
    port: portValue,
    dbAdapter: adapter,
    pgliteDir: resolve(env.PGLITE_DIR ?? './.data/pglite'),
    pgDsn,
    env: runtimeEnv,
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
