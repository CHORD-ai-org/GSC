-- 0009: soft delete (T203) — deleted_at marks trash state
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
