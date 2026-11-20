CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  target_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  related_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  proposed_value TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'agent',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);
