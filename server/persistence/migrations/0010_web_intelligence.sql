-- Web Intelligence (Phase 02): source snapshots (captured versions) + capture tasks.
CREATE TABLE IF NOT EXISTS source_snapshots (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  external_id TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  canonical_url TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  site_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL DEFAULT '',
  extractor_version TEXT NOT NULL DEFAULT '1',
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT NOT NULL DEFAULT '',
  retrieved_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS source_snapshots_identity ON source_snapshots (external_id, content_hash);
CREATE INDEX IF NOT EXISTS source_snapshots_source ON source_snapshots (source_id);

CREATE TABLE IF NOT EXISTS capture_tasks (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  kind TEXT NOT NULL DEFAULT 'web',
  url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  stage TEXT NOT NULL DEFAULT 'queued',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS capture_tasks_status ON capture_tasks (status, created_at);
