# G2_CAPTURE_LOOP_PLAN.md — 三端采集闭环（opencode / codex / WorkBuddy → GSC）

Status: `PROPOSED` — 2026-11-23。
依据：GOALS_2026-11-23.md G2/G3 口径（vision 对齐版）——插件=进口（Light Up 采集）+ 出口（MCP）；
G2 本批只做**进口闭环**：三端使用时数据分组上传 GSC（本地 PG/PGlite）→ Agent 整理分配区块（提案制）。
集成机制已核实（2026-11-23 检索）：opencode 插件事件 / codex notify 钩子+rollout JSONL / MCP。

## 0. 目标（具体场面）

你在 codex 里跑完一轮 → notify 钩子自动把该轮会话摘录按组推到 GSC（组=codex×项目×会话）→
Light Up 管道出语义命名提案 → Agent 把它归进「插件开发」区块（cluster 提案）→ 你点采纳落位。
opencode 同理（session.idle 推送）；WorkBuddy 里说「把这段存进 GSC」即上传。
控制台/详情页能看到来源分组与归块结果。

## 1. Task card（七项）

1. **Purpose** 让三端 AI 工具的使用产出自动流进 GSC 并整理成区块——G2 采集闭环，喂画像/轨迹。
2. **Scope** 批量入料 API（分组）· gsc-push 共享 CLI · opencode 插件 · codex notify 集成 ·
   WorkBuddy skill · Agent 归块（cluster 提案）· G3 兼容矩阵成文。
3. **Interacts** `server/router.ts`（POST /api/ingest/batch，RouteSpec+idem）·
   `server/intel/pipeline.ts`（复用 processSnapshot）· `server/repo/sources.ts`（组→source）·
   `server/agent/`（归块 propose pass + cluster 提案归并语义）· `integrations/gsc-push.mjs`（新）·
   `integrations/opencode/gsc-push.js`（新，`.opencode/plugins/` 装入）·
   `integrations/codex/`（notify 配置片段 + 安装说明）· WorkBuddy skill（新）·
   `component-list.md`（兼容矩阵补全）。
4. **Does not own** MCP 出口（G3 下批）· 登录/鉴权多用户 · 会话 UI（归 Thylas）·
   codex/opencode 内部 UI 集成 · 实时双向同步。
5. **User flow** 安装一次（各端 install 脚本/配置）→ 正常使用三端 → 自动按组上传 →
   GSC 里出命名提案 + 归块提案 → 采纳/拒绝；手动兜底：`gsc-push --file a.md --group ...`。
6. **Minimum** `/api/ingest/batch` + gsc-push CLI + opencode/codex 各一条真推送链 +
   WorkBuddy 一条 + 归块提案落卡 + 矩阵成文。
7. **Test method** vitest（batch 入料幂等/组归一/归块提案生成）+ 三端各真跑一轮推送 +
   提案对账（脚本）+ 截图。

## 2. 技术路径（分层）

### A. 批量入料 API（GSC 端收口）
`POST /api/ingest/batch`：`{ group: { client: 'opencode'|'codex'|'workbuddy', project, session_id,
label? }, docs: [{ title, content_text, url?, author?, captured_at? }] }`。
组→source 归一：`(client, project)` 定 source（label=`agent:<client>:<project>`），会话号进
source_label/外键；逐 doc 走 `upsertSnapshot` + `processSnapshot`（Light Up 提案 best-effort，
幂等复用 contentHash）。idem 头复用现有机制。零新表。

### B. gsc-push 共享 CLI（integrations/gsc-push.mjs）
输入：`--file`/stdin（会话摘录 JSONL 或纯文本）+ `--client` + `--project` + `--session`。
职责：**只搬运**——解析/摘取对话文本（user/assistant 轮次）→ 调 batch API。
三端共用一个 CLI，插件/钩子只是触发器（薄插件原则）。

### C. opencode 集成（integrations/opencode/gsc-push.js）
`.opencode/plugins/` 插件：`event` 监听 `session.idle`（会话空闲即推本轮增量）→ `$` 调
gsc-push。安装脚本把文件软链/复制进目标项目 `.opencode/plugins/`（实施时核对全局配置目录）。
事件清单已核实（session.idle/session.updated/message.updated 可用）。

### D. codex 集成（integrations/codex/）
`~/.codex/config.toml` 加 `notify = ["node", ".../gsc-push.mjs", "--codex-event"]`——
`agent-turn-complete` 事件（argv JSON / CODEX_SESSION_ID 环境变量）→ gsc-push 从
`~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` 增量摘本轮 → 推送。
**风险如实**：rollout JSONL 格式非稳定 API——安装时先 dump 样本核对解析器，漂移记 KNOWN_ISSUES。

### E. WorkBuddy 集成（skill）
WorkBuddy skill（装 `~/.workbuddy/skills/gsc-push/`）：把对话摘录/文件经 batch API 上传，
group=workbuddy×项目。最薄通道（agent 直接 HTTP），无常驻组件。

### F. Agent 归块（分配到区块）
入料后归块 propose pass（LLM）：对新 items 按内容+现有 cluster 命名生成 `cluster` 提案
（proposed_value=区块名）。**归并语义小扩展**：accept 时同名 cluster 已存在→加入成员，
不存在→建（D-042 语义的自然延伸，记录进 DECISION_LOG）。
按内容归块（一批可拆多块），不是一批一块。

### G. G3 兼容矩阵成文（component-list.md）
补全：opencode（采集 ✅ / MCP 读 🔜）· codex（采集 ✅ / MCP 读 🔜 / 模型调用注入 ❌）·
WorkBuddy（采集 ✅ / MCP 读 🔜）· 浏览器扩展（🔜）。每软件集成边界说明同文件。

## 3. 验收门

| 项 | 口径 |
|---|---|
| 三端真链 | opencode/codex/WorkBuddy 各一轮使用 → 自动入库（分组正确：client×project） |
| 幂等 | 同一轮重推零重复（快照 hash） |
| 归块 | 新条目挂 cluster 提案可对账；采纳后归属正确 |
| 兜底 | gsc-push --file 手动推送可用 |
| 回归 | tsc=0 lint=0 vitest 全绿（+新） |

## 4. 不做（本期）

MCP 出口（G3 下批：只读三件）· 浏览器扩展 · 登录墙/反爬 · 多用户 · 会话 UI · codex 模型调用注入。

## 5. 确认点

1. codex 触发：notify 钩子每轮自动推（推荐）vs 手动命令？
2. WorkBuddy 通道做成 skill 装用户级（推荐）还是仅文档？
3. 归块粒度：按内容分块（推荐）vs 一批一块？
