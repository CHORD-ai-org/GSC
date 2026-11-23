-- 0012: V4 (M4) kept-tier spatial layout — per-row coordinates (no JSONB blob).
-- Scratch tier lives in localStorage; pinning promotes rows here (Q-E scratch/kept).
-- Idempotent because migrationSql() replays all migrations.
CREATE TABLE IF NOT EXISTS spatial_layouts (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  page TEXT NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'usr_local',
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (item_id, page, owner_id)
);
