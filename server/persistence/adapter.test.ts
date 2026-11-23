import { describe, expect, it } from 'vitest';
import { readConfig } from '../config.ts';
import { openDatabase } from './client.ts';
import { applyPendingMigrations, migrationFiles } from './migrate.ts';

describe('DB-1 adapter + SEC-2 production gate (config)', () => {
  it('accepts the postgres adapter with a DSN', () => {
    const config = readConfig({ DB_ADAPTER: 'postgres', DATABASE_URL: 'postgres://gsc@127.0.0.1:5432/gsc' });
    expect(config.dbAdapter).toBe('postgres');
    expect(config.pgDsn).toContain('postgres://');
  });

  it('rejects postgres without DATABASE_URL instead of failing later at connect time', () => {
    expect(() => readConfig({ DB_ADAPTER: 'postgres' })).toThrow(/DATABASE_URL/);
  });

  it('still rejects unknown adapters', () => {
    expect(() => readConfig({ DB_ADAPTER: 'mysql' })).toThrow(/Unsupported DB_ADAPTER/);
  });

  it('refuses the private-ingest escape hatch in production', () => {
    expect(() => readConfig({ GSC_ENV: 'production', GSC_INGEST_ALLOW_PRIVATE: '1' }))
      .toThrow(/GSC_INGEST_ALLOW_PRIVATE/);
  });

  it('allows the escape hatch in development and production without it', () => {
    expect(readConfig({ GSC_INGEST_ALLOW_PRIVATE: '1' }).env).toBe('development');
    expect(readConfig({ GSC_ENV: 'production' }).env).toBe('production');
    expect(readConfig({ GSC_ENV: 'production' }).allowPrivateIngest).toBe(false);
  });
});

/* Real-database acceptance for the postgres adapter runs when a DSN is
   provided (GSC_PG_DSN); this environment has no Docker daemon (D-026), so
   the stub-tested adapter ships with acceptance pending — recorded in
   DECISION_LOG, never claimed as verified. */
describe.skipIf(!process.env.GSC_PG_DSN)('DB-1 postgres adapter acceptance', () => {
  it('migrates a fresh postgres database and becomes idempotent', async () => {
    const handle = await openDatabase({ adapter: 'postgres', dsn: process.env.GSC_PG_DSN });
    try {
      const ran = await applyPendingMigrations(handle);
      expect(ran.length).toBe(migrationFiles().length);
      expect(await applyPendingMigrations(handle)).toEqual([]);
      const probe = await handle.exec('SELECT 1 AS ok');
      expect(probe[0]?.rows[0]?.ok).toBe(1);
    } finally {
      await handle.close();
    }
  });
});
