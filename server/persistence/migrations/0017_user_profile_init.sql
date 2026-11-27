-- USER_PROFILE_INIT_PLAN U1：伴灵名 + 用户画像锚点标记
ALTER TABLE users ADD COLUMN IF NOT EXISTS companion_name TEXT;

-- 组成员边（此前 meta_tag_groups 零 seed → 用户画像组无成员 → 建议器空转）
INSERT INTO tag_definitions (id, name, description, created_at)
  VALUES ('tag_background', 'Background', 'Life trajectory: education, milestones, turning points', NOW())
  ON CONFLICT (id) DO NOTHING;
INSERT INTO meta_tag_groups (tag_id, group_id, created_at) VALUES
  ('tag_user_profile', 'grp_profile', now()),
  ('tag_thinking_style', 'grp_profile', now()),
  ('tag_expertise', 'grp_profile', now()),
  ('tag_interest', 'grp_profile', now()),
  ('tag_interest', 'grp_experience', now()),
  ('tag_background', 'grp_experience', now())
ON CONFLICT (tag_id, group_id) DO NOTHING;
