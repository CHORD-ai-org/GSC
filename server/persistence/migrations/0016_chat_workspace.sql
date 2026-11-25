-- 0016: GSC 对话工作面（G7）数据层 — GSC_CHAT_PLAN.md v2 §2 Step 1。
-- 在 0015 conversations/messages 之上补：消息块（UI 投影源）、任务/阶段（状态机）、
-- uiflows（DSL）。ord 稀疏（间隔 1024，repo 层分配）；枚举全部 DB CHECK 约束。

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 消息块：kind∈text|operation|flow|reference|note；UI 投影源（append-only）
CREATE TABLE IF NOT EXISTS message_blocks (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'operation', 'flow', 'reference', 'note')),
  ord INTEGER NOT NULL,
  ref_id TEXT,
  content TEXT NOT NULL DEFAULT '',
  UNIQUE (message_id, ord)
);

-- 任务卡（持久对象；乐观锁 version）
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'failed')),
  version INTEGER NOT NULL DEFAULT 1
);

-- 管线阶段：状态机 pending→running→(awaiting_user)→done|failed（转移表在 repo 层白名单）
CREATE TABLE IF NOT EXISTS task_stages (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('collect', 'synthesize', 'compose', 'confirm')),
  name TEXT NOT NULL DEFAULT '',
  ord INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'awaiting_user', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  steps TEXT NOT NULL DEFAULT '[]',
  detail TEXT NOT NULL DEFAULT '',
  UNIQUE (task_id, ord)
);

-- DSL 交互面（onboarding 等）
CREATE TABLE IF NOT EXISTS uiflows (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL REFERENCES task_stages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'onboarding',
  dsl_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'done', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS task_stages_task_idx ON task_stages (task_id, ord);
CREATE INDEX IF NOT EXISTS message_blocks_message_idx ON message_blocks (message_id, ord);
