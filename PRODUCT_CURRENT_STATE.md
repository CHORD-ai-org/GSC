# PRODUCT_CURRENT_STATE.md — GSC 实现盘点（End-to-End 审计 · Phase 00）

> 2026-11-20 · 全部状态来自代码/路由/迁移/测试实测。状态口径：IMPLEMENTED / PARTIALLY_IMPLEMENTED / DESIGNED_NOT_IMPLEMENTED / NOT_DESIGNED / NOT_APPLICABLE。

## 0. 一句话结论

GSC 的**信息核心是完整且有测试保障的**（采集→理解→组织→出口全链路可用），但**产品外壳缺失**：没有账户系统、没有引导、没有全局搜索、没有分页——它今天是一个「单机专家工具」，不是 Vision 描述的「持久信息基础设施」。

## 1. 技术底座

| 项 | 实况 | 证据 |
|---|---|---|
| 前端 | React 19 + Vite + CSS Modules，零 UI 依赖；15 页面 | `src/views/`、`src/app/` |
| 后端 | Node 22 原生 TS，node:http 手写路由，32 端点 | `server/router.ts:109-134` |
| 数据库 | PGlite（单文件 Postgres），drizzle，迁移 0000–0007 | `server/persistence/schema.ts` |
| 测试 | vitest 80 用例 / 17 文件全绿 | `npx vitest run` |
| 认证 | Bearer PAT token（read/rw 两档），AES-GCM 密钥，限流 | `server/storage/tokens.ts`、`server/router.ts:202-219` |
| LLM | OpenAI 兼容适配器（MiMo/DeepSeek/10 厂商可配），提议不决策 | `server/agent/llm.ts`、`server/storage/settings.ts` |

## 2. 实现盘点（按 Vision 章节）

### §3.1 Light Up 采集 — PARTIALLY_IMPLEMENTED

| 能力 | 状态 | 证据 |
|---|---|---|
| Composer 文本捕获 | IMPLEMENTED | `src/app/Composer.tsx`（Ask/Agent/Edit 三模式、/命令） |
| 文件导入（txt/md） | IMPLEMENTED | `App.tsx:555 importFileObject` → `raw.filecontent` |
| URL 抓取（预览不落库） | IMPLEMENTED | `POST /api/ingest/url` + `server/ingest/html.ts`（SSRF 防护） |
| 规则切块（段落/标题） | IMPLEMENTED | `src/lib/lightup.ts:43 segmentText`（D-047 人审门） |
| 合并/拆分/重命名段 | IMPLEMENTED | `mergeSegments`/`splitSegment` + LightUp 工作区 |
| 语义命名建议 | PARTIALLY_IMPLEMENTED | 规则 `suggestTitle`；LLM 命名走 Agent 提议路径，非 Light Up 内嵌 |
| 分类（类型/域） | IMPLEMENTED | 手动下拉（`SemanticObjectSheet`） |
| Meta Tag 建议 | PARTIALLY_IMPLEMENTED | 手动打标（TagEditor）；Agent 提议标签存在但入口深 |
| 源文保存 | IMPLEMENTED | 原文逐字保留（`item_content`，D-047 Preserve Before Interpreting） |
| 提案审阅 | IMPLEMENTED | `proposals` 表 + 提案队列 + Light Up 审阅屏 |
| 8 步管线串成一体验 | PARTIALLY_IMPLEMENTED | 「Capture→Understand→Shape→Curate→Illuminate」为 UI 分区，非强制向导；无进度持久化 |

### §3.2 Sync 外部源 — PARTIALLY_IMPLEMENTED

| 能力 | 状态 | 证据 |
|---|---|---|
| Source 增删改查 | IMPLEMENTED | `POST/PATCH/DELETE /api/sources` |
| GitHub 适配器（issues→raw） | IMPLEMENTED | `server/sync/github.ts`，按 source_label 去重 |
| 手动/每日频率 | PARTIALLY_IMPLEMENTED | 字段已有；**调度器未实现**（「每日（调度在 C3-1）」占位） |
| 同步状态/错误/重试 | IMPLEMENTED | 状态点 + 报错卡 + 重试按钮（P2 加） |
| Notion/Drive/X 官方接入 | DESIGNED_NOT_IMPLEMENTED | B3-1 占位（品牌卡片已就位） |
| 同步内容溯源 | IMPLEMENTED | `origin:import` + `source_label` |

### §4 Agent / Detector — PARTIALLY_IMPLEMENTED

| 能力 | 状态 | 证据 |
|---|---|---|
| Agent 提议（组织/命名/标签） | IMPLEMENTED | `POST /api/agent/propose` + `server/agent/proposer.ts`（「you never decide」） |
| Detector 观察+候选 | IMPLEMENTED | `server/agent/detector.ts`（相似度≥0.8 去重候选→proposals） |
| 人审治理（确认才算数） | IMPLEMENTED | `POST /api/proposals/:id/resolve`，pending→accepted/rejected |
| Agent 记忆/上下文积累 | NOT_DESIGNED | Vision 未展开；每次提议无长期记忆 |
| Detector 规则多样性 | PARTIALLY_IMPLEMENTED | 仅去重一种检测；命名漂移/标签冲突等检测未设计 |

### §5 信息结构 — IMPLEMENTED（核心最强）

| 概念 | 状态 | 证据 |
|---|---|---|
| Chunk（raw.* + object.* 双类） | IMPLEMENTED | `items`+`item_content`，5 raw + 5 object 类型 |
| 语义命名（title 稳定 ID） | IMPLEMENTED | D-043；机器命名走提案层 |
| 关系（derived_from 等） | IMPLEMENTED | `relations` 边唯一索引，UI 可建/删 |
| 溯源/历史 | IMPLEMENTED | `events` append-only，详情页 History |
| Cluster（多归属显式成员） | IMPLEMENTED | `clusters`+`cluster_members`，复合 PK |
| Context（目的视图显式成员） | IMPLEMENTED | `contexts`+`context_members` |
| Meta Tag（定义/取值/作用域三层） | IMPLEMENTED | `tag_definitions`+`tag_values`，confirmed 治理 |
| User Profile 聚合输出 | IMPLEMENTED | `GET /api/profile`（仅输出 confirmed） |

### §6 对外基础设施 — PARTIALLY_IMPLEMENTED

| 能力 | 状态 | 证据 |
|---|---|---|
| REST API（32 端点） | IMPLEMENTED | `/api/` + `/api/v1/` 别名，错误 envelope |
| MCP server（7 工具） | IMPLEMENTED | `server/mcp/index.ts`：get_chunk/list_chunks/browse_clusters/browse_contexts/get_context/get_user_profile/propose |
| Token 授权（read/rw） | PARTIALLY_IMPLEMENTED | 机制存在（create/verify/revoke）；**无 UI 管理面**，仅 `scripts/create-token.mjs` |
| Python/TS SDK | DESIGNED_NOT_IMPLEMENTED | PLAN-6 C 段 |
| Agent 提议写回 | IMPLEMENTED | `gsc_propose` → proposals（人审门在） |
| API 用量/审计日志 | PARTIALLY_IMPLEMENTED | 结构化日志 + X-Request-Id 有；用户可见的访问记录无 |

### §7 Dashboard — IMPLEMENTED（经两轮 UX 优化）

15 页全可用：Start（composer+新闻显示器）、Overview、Recently、Raw、Objects、Clusters、Contexts、Sync&Export、Settings（7 区）、User、Docs、Canvas、Light Up。列表⇄网格双视图、Ctrl+K 命令面板、双语、深色、品牌 logo 体系。

### 账户与引导 — NOT_DESIGNED（审计重点）

| 能力 | 状态 | 证据 |
|---|---|---|
| 注册/登录 | NOT_DESIGNED | 无任何 auth 流；单用户硬编码 `usr_local`（`tokens.ts DEFAULT_USER_ID`） |
| 落地页/价值传达 | NOT_DESIGNED | 应用直启，无 landing |
| Onboarding 引导 | NOT_DESIGNED | 无欢迎流/示例内容/信息模型教学 |
| User Profile 初始化 | PARTIALLY_IMPLEMENTED | User 页可打标签，但无引导式问答 |
| 多用户 | DESIGNED_NOT_IMPLEMENTED | `users` 表+分享有；账户体系无（DESIGN_BOUNDARIES 把账户划给 Thylas） |
| 账户删除/数据导出 | PARTIALLY_IMPLEMENTED | 导出 3 格式 IMPLEMENTED；删除账户 NOT_DESIGNED（本地库可整体删文件） |
| 分页/增量加载 | NOT_DESIGNED | `listItems` 全量返回，百级 Chunk 起将退化 |
| 全局搜索 | PARTIALLY_IMPLEMENTED | 各列表页本地子串过滤（title/fields）；无全文/跨页/语义搜索 |
| 撤销 Agent 访问 | PARTIALLY_IMPLEMENTED | `revokeApiToken` 后端有；UI 无 |

## 3. 数据模型（15 表）

items · item_content · relations · events · contexts · context_members · clusters · cluster_members · users · cluster_shares · cluster_share_events · proposals · sources · tag_definitions · tag_values · idempotency_keys

## 4. 与 Vision 的距离总览

| Vision 承诺 | 落地程度 |
|---|---|
| 信息有身份（语义命名+溯源） | ★★★★★ 完整 |
| 信息随时间积累（采集+同步） | ★★★★☆ 采集全通，同步半通 |
| 信息被组织而非仅存储 | ★★★★★ 四结构全有 |
| 跨应用可访问（API/MCP） | ★★★★☆ 通路在，管理面缺 |
| 持久信息基础设施（账户/信任/规模） | ★★☆☆☆ **最大缺口** |
