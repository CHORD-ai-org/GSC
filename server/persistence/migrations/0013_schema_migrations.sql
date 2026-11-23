-- DB-2: migration version table. Managed out-of-band by migrate.ts (created
-- before any file runs; legacy databases are stamped without replay). This
-- file exists so the directory stays self-describing for fresh installs.
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
