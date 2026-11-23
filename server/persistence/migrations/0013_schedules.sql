-- 0013: cloud-isomorphic scheduled collection (LOCAL_SIM_PLAN) — scheduler registry.
-- Folder scans and web crawls run on the worker with interval + in-flight lock.
-- Idempotent because migrationSql() replays all migrations.
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('folder', 'web')),
  root_path TEXT NOT NULL DEFAULT '',
  url_list TEXT NOT NULL DEFAULT '',
  interval_min INTEGER NOT NULL DEFAULT 5,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running')),
  last_run_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  owner_id TEXT NOT NULL DEFAULT 'usr_local',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
