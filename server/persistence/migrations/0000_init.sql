CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'knowledge',
  origin TEXT NOT NULL DEFAULT 'user',
  source_label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS item_content (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  content_text TEXT,
  author TEXT,
  locator TEXT,
  filename TEXT,
  storage_ref TEXT,
  mime_type TEXT,
  captured_at TEXT,
  measured_at TEXT,
  definition TEXT,
  notes TEXT,
  claim TEXT,
  reasoning TEXT,
  name TEXT,
  steps TEXT,
  intended_use TEXT,
  statement TEXT,
  alternatives TEXT,
  consequences TEXT,
  source_item_id TEXT REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  from_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'user'
);

CREATE UNIQUE INDEX IF NOT EXISTS relations_edge_unique
  ON relations(kind, from_id, to_id);

CREATE INDEX IF NOT EXISTS items_type_idx ON items(type);
CREATE INDEX IF NOT EXISTS items_domain_idx ON items(domain);
CREATE INDEX IF NOT EXISTS relations_from_idx ON relations(from_id);
CREATE INDEX IF NOT EXISTS relations_to_idx ON relations(to_id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  at TIMESTAMPTZ NOT NULL,
  actor TEXT NOT NULL DEFAULT 'user',
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS events_item_idx ON events(item_id);
