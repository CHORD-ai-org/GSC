-- 0015: SEMANTIC_TITLE_PLAN (batch A) — outline nodes L1–L4 for raw documents
-- (semantic title targets) + proposals.target_path for node-scoped semantic_name
-- proposals. Idempotent.

CREATE TABLE IF NOT EXISTS outline_nodes (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  level INTEGER NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  title TEXT NOT NULL,
  name_origin TEXT NOT NULL DEFAULT 'rule',
  text_head TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS outline_nodes_item_path ON outline_nodes (item_id, path);

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS target_path TEXT;
