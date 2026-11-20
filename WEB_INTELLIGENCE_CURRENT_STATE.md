# Web Intelligence — Current State (Phase 00 Investigation)

> 仓库调查结论。目标：把「同步与导出」的数据源做成**真实可用**的信息采集通道，每条通道有
> **提取 pipeline（确定性 adapter）** 与 **整合 pipeline（LLM proposer）**。本文只陈述事实与缺口，
> 架构决策见 `WEB_INTELLIGENCE_ARCHITECTURE.md`，落地步骤见 `WEB_INTELLIGENCE_IMPLEMENTATION_PLAN.md`。

## 1. 技术栈与运行时
- 后端：Node（TS strip-only，注意不支持构造函数参数属性）+ 原生 `http.ts` 路由（`server/router.ts`）。
- 持久化：PGlite / PostgreSQL + drizzle-orm（`server/persistence/schema.ts`、`client.ts`、`migrations/`）。
- 前端：React + Vite + CSS Modules，零外部 UI/i18n 依赖。
- LLM：`server/agent/llm.ts`（`chatComplete` + `extractJson`），MiMo token-plan，`thinking:{type:'disabled'}`。
- 测试：vitest（当前 93 用例）；`tsc --noEmit` 必须 0 错误。

## 2. 信息权威模型（必须保留）
生命周期：`Source → Extraction → Processing → Proposal → User Confirmation → Persistence`。
- 机器只**提议**（`proposals` 表，`source=agent|detector`），从不直接写用户已确认信息。
- Provenance 字段：`items.origin`（user/import/machine）、`source_label`、`item_content.source_item_id`。
- 确认后才落到 `items`/`item_content`/`relations`。

## 3. Light Up 处理管线（整合侧，已存在）
| 模块 | 职责 | 现状 |
|---|---|---|
| `agent/llm.ts` | LLM 调用、超时、重试、usage、metrics | 完整（INTEGRATION_HARDENING P0） |
| `agent/proposer.ts` | `suggestForChunks` → semantic_name/classification/rationale | 完整，可复用 |
| `agent/detector.ts` | 相似度去重/关联/元数据缺口 → proposals | 完整（O5-2 倒排索引剪枝） |
| `repo/proposals.ts` | 提案 CRUD | 完整 |
| `src/lib/lightup.ts` | 前端 Light Up（采集→审阅→确认） | 完整 |

**结论**：整合 pipeline 已有，Web Intelligence 无需重造，只需把「提取产物」喂进它。

## 4. 采集/提取侧（缺口最大）
| 模块 | 职责 | 现状 |
|---|---|---|
| `ingest/ssrf.ts` | SSRF 防护（私网/保留段/元数据端点/DNS/重定向复检） | **完整，可复用** |
| `ingest/html.ts` | `fetchUrlText`（超时/大小/重定向循环）+ naive HTML→text | 仅**预览**，不持久化，提取朴素 |
| `sync/github.ts` | GitHub issues → `createItem`（`source_label` 去重） | **唯一真实数据源** |
| `storage/secrets.ts` | AES-256-GCM 密钥存取 | 完整（供需 token 数据源用） |
| 后台任务/worker | 异步采集、重试、恢复 | **不存在** |

## 5. 数据模型（`persistence/schema.ts`）
已有：`items`+`item_content`（含 provenance）、`relations`、`events`、`contexts`/`context_members`、
`clusters`/`cluster_members`、`users`、`proposals`、`sources`、`tag_definitions`/`tag_values`、`idempotency_keys`。
- `sources` 表字段：`id/kind/label/scope/status/frequency/last_sync_at/last_error`（含 `repo/sources.ts` CRUD + `markSync`）。
- **缺**：Source Snapshot（采集版本）、Capture Task（异步任务）两张表（架构文档给出最小迁移）。

## 6. 数据源（「同步与导出」页）
- `src/lib/sources.ts`：`SOURCE_KINDS = ['github','notion','drive','x']` —— **仅 github 真实**，notion/drive/x 是占位卡片。
- 前端 `views.tsx` Sync 页：`brandCard` 卡片墙 + 连接滑出面板 + `sourceCard` 已连接列表。
- 导出（同页）：`src/lib/sync.ts` 的 `buildJsonExport` / `buildMarkdownBundle` / `buildAgentContext` + `downloadArtifact`。

## 7. 缺口清单（= 本次交付）
1. **数据源少且半真**：只有 github 真实；缺 `web`/`rss`/`file` 等无授权数据源；notion/drive/x 无真实 adapter。
2. **提取 pipeline 薄弱**：`html.ts` naive、不持久化、无结构化元数据、无 content hash/去重。
3. **无「提取 agent pipeline」**：没有统一 adapter 接口把各来源 → 结构化 Capture。
4. **整合 pipeline 未接到采集**：proposer/detector 只在 Light Up 手动流里跑，未与数据源采集打通。
5. **无后台任务**：采集靠同步 HTTP 请求，无 pending/processing/failed、无重试/恢复。
6. **无组件文档**：`COMPONENT_REGISTRY.md` 等不存在（计划 Part 8 要求）。

## 8. 可复用资产（不要重造）
- 安全：`ingest/ssrf.ts`、`storage/secrets.ts`。
- 整合：`agent/proposer.ts`、`agent/detector.ts`、`repo/proposals.ts`、`repo/items.ts`（`createItem`）。
- 数据源：`repo/sources.ts`（CRUD + `markSync`）、`sync/github.ts`（adapter 雏形）。
- 模型：`items`/`item_content` provenance 字段、`sources` 表。
