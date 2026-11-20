-- 0008: pagination index (T202) — keyset cursor on (updated_at, id) desc
CREATE INDEX IF NOT EXISTS items_updated_id_idx ON items (updated_at DESC, id DESC);
