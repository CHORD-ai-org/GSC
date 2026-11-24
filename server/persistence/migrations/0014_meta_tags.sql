-- 0014: Meta Tag System v1.0 (META_TAG_SYSTEM_V1.md, PROPOSED→executed) —
-- three layers: meta groups (four seeded) ←multi-parent→ tags → assignments,
-- plus typed parameter sets (assignment-level and item-level). Idempotent.

CREATE TABLE IF NOT EXISTS meta_groups (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility_default TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- multi-parent edges: one tag may belong to several groups (DAG layer 1)
CREATE TABLE IF NOT EXISTS meta_tag_groups (
  tag_id TEXT NOT NULL REFERENCES tag_definitions(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES meta_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (tag_id, group_id)
);

-- typed parameters on an assignment (tag_values row = 打标记录)
CREATE TABLE IF NOT EXISTS assignment_params (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES tag_values(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE (assignment_id, key)
);

-- chunk-level meta parameter set (orthogonal to tagging)
CREATE TABLE IF NOT EXISTS item_meta_params (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE (item_id, key)
);

-- idempotent tagging: same (tag, chunk, value, scope) stays one assignment
CREATE UNIQUE INDEX IF NOT EXISTS tag_values_assign_unique
  ON tag_values (definition_id, COALESCE(item_id, ''), value, scope);

-- meta_tag proposals carry the definition id here (proposals.related_id is an
-- items FK, so a tag definition id cannot live there)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS related_definition_id TEXT;

-- V1.0 seed groups (fixed set, founder-approved 2026-11-24)
INSERT INTO meta_groups (id, key, name, description, visibility_default, created_at) VALUES
  ('grp_profile', '用户画像', '用户画像', '人的稳定特征（思维风格/专长/偏好/工具链）', 'private', now()),
  ('grp_experience', '个人经历', '个人经历', '人的经历轨迹（教育/履历/里程碑/转折）', 'private', now()),
  ('grp_log', '日志', '日志', '行为与过程记录（每日/实验/教训/状态变更）', 'private', now()),
  ('grp_project', '项目', '项目', '项目与作品（项目名/技术栈/角色/阶段/交付物）', 'shared', now())
ON CONFLICT (id) DO NOTHING;
