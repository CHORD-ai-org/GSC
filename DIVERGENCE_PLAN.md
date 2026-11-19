# DIVERGENCE_PLAN.md — 从现有结构发散的规划方向

Status: `PROPOSED` — 2026-11-19。全部为候选方向，未获批不实施。配套代码现状见 `IMPLEMENTATION_STATUS.md`，边界见 `DESIGN_BOUNDARIES.md`。

**一句话结论：** 现有结构里埋了 7 个还没用上的钩子，每个钩子都能长出一条真实的功能线；建议 P0 做 D2（Context 交付）和 D1（模型接入），它们正好是 Phase 06 评估需要的集成面。

## 1. 结构里已埋好、尚未用上的钩子

| 钩子（代码事实） | 现状 | 可发散成 |
|---|---|---|
| `ORIGINS` 含 `agent`（`src/lib/items.ts:23`） | 没有任何 UI 会写 `origin: agent` | D1 |
| Composer 三个模式 Ask/Agent/Edit | 行为完全相同，都只做文本捕获 | D1 |
| 模型选择 Deepseek/Rym（D-033） | 纯 UI，无 provider 层 | D1 |
| `contexts` + 显式成员列表 | 只在 UI 里看，没有对外交付通道 | D2 |
| `sync.ts` 三个导出 builder | 只出不进，只导出全量不导出单个 Context | D2、D4 |
| 关系含 `supports`/`challenges`（stance 展示规则已定） | 只有 Outgoing/Incoming 文字列表 | D3 |
| Canvas 卡片网格 + 命令栏 | 只做标题过滤，无连线、无摆放 | D3 |
| `raw.message` / `raw.evidence`（需 author / locator） | 类型和表单都在，没有捕获入口 | D6 |
| `raw.filecontent` 的 `storage_ref`/`mime_type` 字段 | 文件存 `data/files/`，字段基本闲置 | D4、D6 |
| `Recently` 的排序+截断逻辑 | 写死在视图里，不是可保存的视图 | D5 |
| prefs 持久化（`gsc.ui.prefs.v1`） | 只存动画质量/转场/默认模型 | D7 |
| `scripts/ui-shots.mjs` 全套截图 | 只跑一次，没有回归对比 | K 类工具项 |

## 2. 七个发散方向

### D1 模型接入：Composer 变成真的（PROPOSED）

- 场景：在 Composer 贴一段论文摘要，选 Agent 模式，Deepseek 直接产出 Concept/Hypothesis 草稿（`origin: agent`），你确认后入库。
- 建在：Composer 模式/模型选择器、`origin: agent` 词汇、NewForm 的对象表单。
- 最小产出：OpenAI 兼容 provider 适配层 + Agent 模式产出「草稿对象」待确认；Ask 模式做问答引用，Edit 模式对选中条目改写。
- 不做：全自动入库（必须人工确认）；推理仍不进 GSC 核心，走外部 endpoint。

### D2 Context 交付：把上下文喂给 agent（PROPOSED）

- 场景：选一个 Knowledge Context，一键生成它的上下文包放进 Claude Code / Codex 的仓库，agent 开工就带着这批上下文。
- 建在：`contexts`+成员、`buildAgentContext`、`GSC-CONTEXT.md` 导出。
- 最小产出：Sync 增加「按 Context 导出」单包；备选形态是本地只读端点 `/api/contexts/:id/export`（给 MCP 用）。
- 不做：权限系统；云端分发。

### D3 画布文档：Context 即画布（PROPOSED）

- 场景：点开 Knowledge Context，画布上摊开它的成员卡片和 `derived_from` 连线；点条目详情「在画布中查看」，以它为中心画一跳关系。
- 建在：Canvas 卡片网格、关系数据、`supports`/`challenges` 的 stance 展示规则。
- 最小产出：按 Context 摆卡片 + 显式一跳连线 + 导出画布图片。
- 不做：自由拖拽布局持久化、自动布局推理、力导向图引擎。

### D4 双向 Sync：从导出到同步（PROPOSED）

- 场景：把 `GSC-CONTEXT.md` 固定写到指定仓库目录，数据一变自动更新；反向把改过的 md 拉回来更新原始条目。
- 建在：`sync.ts`、文件导入通道、`storage_ref` 字段。
- 最小产出：Sync 配置目标目录（本地落盘）+ JSON 回灌导入。
- 不做：云同步协议；冲突合并（先记 KNOWN_ISSUES）。

### D5 智能视图：从 Recently 到保存的视图（PROPOSED）

- 场景：侧栏存「本周的 Decision」「没有来源的 Evidence」，点开即筛，像 Recently 一样。
- 建在：Recently 的排序/截断、筛选器（type/domain/q）、Sidebar 分组。
- 最小产出：saved views（筛选条件持久化）+ 侧栏一个「VIEWS」组。
- 不做：语义检索、向量库（DESIGN_BOUNDARIES 明确排除）。

### D6 批量捕获：拖文件夹与剪贴板（PROPOSED）

- 场景：把整个 md 文件夹拖进画布，全部变成 `raw.filecontent`，`source_label` 按文件夹名分组；复制一段聊天记录用快捷键直接捕获为 `raw.message`。
- 建在：file import、`raw.message`/`raw.evidence` 的表单与必填字段、Composer。
- 最小产出：多文件拖拽导入 + 全局剪贴板捕获。
- 不做：OCR、二进制解析（`RAW_INFORMATION_TAXONOMY` 边界）。

### D7 视觉体系：主题与背景样式（PROPOSED）

- 场景：Settings 里切 Light/Dark；点阵背景除了质量档再加样式档（点阵/斜纹/纯色）。
- 建在：`tokens.css` 单套 token、prefs 持久化、动画层。
- 最小产出：dark token 集 + 主题开关。
- 不做：自定义主题编辑器。

## 3. 优先级建议

| 批 | 方向 | 理由 |
|---|---|---|
| P0 | D2 Context 交付、D1 模型接入 | 让 GSC 从「存」变「用」；直接构成 Phase 06 场景 A–D 的集成面 |
| P1 | D3 画布文档、D4 双向 Sync、D5 智能视图 | 各自独立，可并行，不互相阻塞 |
| P2 | D6 批量捕获、D7 主题 | 锦上添花，等 P0/P1 定型后再做 |
| K | 截图回归对比（`ui-shots.mjs` 加 diff） | 工具项，随时可插 |

与 Phase 06 的关系：D1/D2 先行则评估更实；若先跑 Phase 06（场景 A–D 观察记录），D1/D2 可在评估发现缺口后再定。

## 4. 待定（选完我再展开对应的任务卡）

1. 优先级照上表，还是改序？
2. D1 的 provider 走哪种：Deepseek 云 API，还是本地 OpenAI 兼容端点（llama.cpp / Ollama）？
3. D2 的形态：离线文件包，还是本地只读端点（MCP 可调）？
