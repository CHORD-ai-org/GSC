-- Phase 02 hardening: idempotency keys + tag_values uniqueness (BACKEND_CURRENT_STATE §4-1/4-2).

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key text NOT NULL,
  endpoint text NOT NULL,
  request_hash text NOT NULL,
  status integer NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (key, endpoint)
);

-- Deduplicate existing tag assignments (keep the earliest), then enforce uniqueness.
DELETE FROM tag_values a USING tag_values b
  WHERE a.id > b.id
    AND a.definition_id = b.definition_id
    AND COALESCE(a.item_id, '') = COALESCE(b.item_id, '')
    AND a.value = b.value
    AND a.scope = b.scope;

CREATE UNIQUE INDEX IF NOT EXISTS tag_values_unique
  ON tag_values (definition_id, COALESCE(item_id, ''), value, scope);
