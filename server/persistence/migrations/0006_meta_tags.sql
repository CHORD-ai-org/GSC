-- PLAN-8 (D-064/D-066): Meta Tag three-layer model — definitions, values, scope.
-- Definitions are controlled; values are free; scope bounds validity.

CREATE TABLE IF NOT EXISTS tag_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS tag_values (
  id text PRIMARY KEY,
  definition_id text NOT NULL REFERENCES tag_definitions(id) ON DELETE CASCADE,
  item_id text REFERENCES items(id) ON DELETE CASCADE,
  value text NOT NULL,
  scope text NOT NULL DEFAULT 'global',
  confirmed integer NOT NULL DEFAULT 0,
  owner_id text NOT NULL DEFAULT 'usr_local',
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS tag_values_definition_idx ON tag_values(definition_id);
CREATE INDEX IF NOT EXISTS tag_values_item_idx ON tag_values(item_id);

-- Pre-seeded Vision §5.4 dimensions (D-064); idempotent.
INSERT INTO tag_definitions (id, name, description, created_at) VALUES
  ('tag_thinking_style', 'Thinking Style', 'How a person approaches reasoning and problem-solving', NOW()),
  ('tag_user_profile', 'User Profile', 'Characteristics, preferences and working context of the user', NOW()),
  ('tag_expertise', 'Expertise', 'Areas of knowledge or demonstrated experience', NOW()),
  ('tag_interest', 'Interest', 'Subjects a user is interested in', NOW()),
  ('tag_methodology', 'Methodology', 'Approaches or methods used to accomplish work', NOW()),
  ('tag_project_association', 'Project Association', 'The project or activity an information unit relates to', NOW())
ON CONFLICT (id) DO NOTHING;
