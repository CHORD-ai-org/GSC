-- 0011: owner scoping for contexts and sources (security: IDOR hardening).
-- Backward-compatible ADD COLUMN with a default so existing rows keep working.
-- Idempotent (IF NOT EXISTS) because migrationSql() replays all migrations.
ALTER TABLE contexts ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT 'usr_local';
ALTER TABLE sources ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT 'usr_local';
