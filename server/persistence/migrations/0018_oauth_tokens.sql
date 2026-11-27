-- USER_PROFILE_INIT_PLAN U4：X OAuth 令牌存储（provider 级，一人一 provider 一令牌）
CREATE TABLE IF NOT EXISTS oauth_tokens (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (user_id, provider)
);
