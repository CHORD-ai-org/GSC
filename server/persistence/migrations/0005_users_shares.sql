CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

INSERT INTO users (id, name, created_at)
VALUES ('usr_local', 'Local', NOW())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE items ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT 'usr_local' REFERENCES users(id);
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT 'usr_local' REFERENCES users(id);

CREATE TABLE IF NOT EXISTS cluster_shares (
  cluster_id TEXT NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (cluster_id, user_id)
);

CREATE TABLE IF NOT EXISTS cluster_share_events (
  id TEXT PRIMARY KEY,
  cluster_id TEXT NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL
);
