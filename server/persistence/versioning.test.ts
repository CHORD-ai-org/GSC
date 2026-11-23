import { describe, expect, it } from 'vitest';
import { createDatabase } from './client.ts';
import { applyPendingMigrations, migrationFiles, migrationSql } from './migrate.ts';

describe('DB-2 migration version table', () => {
  it('applies every file once on a fresh database and records it', async () => {
    const handle = createDatabase();
    try {
      const ran = await applyPendingMigrations(handle);
      expect(ran).toEqual(migrationFiles());
      const rows = await handle.exec('SELECT filename FROM schema_migrations');
      expect(rows[0]?.rows).toHaveLength(migrationFiles().length);
    } finally {
      await handle.close();
    }
  });

  it('runs nothing on a second migrate (no full-directory replay)', async () => {
    const handle = createDatabase();
    try {
      await applyPendingMigrations(handle);
      expect(await applyPendingMigrations(handle)).toEqual([]);
    } finally {
      await handle.close();
    }
  });

  it('stamps legacy databases (pre-version-table) without replaying files', async () => {
    const handle = createDatabase();
    try {
      // legacy shape: every file already replayed, no version rows recorded
      await handle.exec(migrationSql());
      const ran = await applyPendingMigrations(handle);
      expect(ran).toEqual([]);
      const rows = await handle.exec('SELECT filename FROM schema_migrations');
      expect(rows[0]?.rows).toHaveLength(migrationFiles().length);
    } finally {
      await handle.close();
    }
  });

  it('picks up only pending files on an existing versioned database', async () => {
    const handle = createDatabase();
    try {
      await applyPendingMigrations(handle);
      // simulate a newly-added migration landing after the first install
      await handle.exec("DELETE FROM schema_migrations WHERE filename = '0000_init.sql'");
      const ran = await applyPendingMigrations(handle);
      expect(ran).toEqual(['0000_init.sql']);
      const rows = await handle.exec("SELECT filename FROM schema_migrations WHERE filename = '0000_init.sql'");
      expect(rows[0]?.rows).toHaveLength(1);
    } finally {
      await handle.close();
    }
  });
});
