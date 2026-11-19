CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  scope TEXT NOT NULL,
  purpose TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS context_members (
  context_id TEXT NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (context_id, item_id)
);

CREATE INDEX IF NOT EXISTS context_members_context_idx ON context_members(context_id);
