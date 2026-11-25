# THINKING.md — Active Task

> Last updated: 2026-11-21
> Standing instruction: read this file before every answer in this workspace.
> Status: **G7 Step 0/1 完成（2026-11-25）**：D-110 边界演进落账（对话工作面入 GSC）+ 0016 数据层（消息块/任务/阶段状态机/uiflows，CHECK 枚举+稀疏 ord+乐观锁 version）；chat_workspace 2/2。下一步 G7 Step 2（repo/chat 扩展：PATCH 算子+转移表白名单）。
> Prior: SIDEBAR_PLAN 执行完成（D-109，2026-11-25）**：置顶折叠区+对话「最近」（conversations 骨架前置 G7）+双「最近」语义分立+路由 /chat/:id；实测截图全中。黄点/真 ChatView/置顶动作随 G7。
> Prior: 语义标题 pipeline 落地（D-107，2026-11-24）G4 前半**：outline_nodes 模型 + 派生（≤4级自适应）+ titler 同父批量生成（碰撞簇重生1次）+ ensure-titles 按需提案 + OutlinePanel 三态徽标，四态实拍验收全通（规则名→提案中→已确认）。G4 缩放手势/远景列表另轨（共享 outline_nodes）。
> Prior: **G5 完整收尾（D-106，2026-11-24）**：pending_definition 提案流（new:<name> 引用→建定义→升级引用→打标落卡）；实测揪出「提前 accept 被消费」缺陷并修（保持 pending+blocked 溯源）。G5 Meta-tag v1.0 MVP 全闭环。
> Prior: META_TAG_SYSTEM_V1 完成（D-105，2026-11-24）**：四组预置（画像/经历/日志/项目）+tag 多父边+两层 typed 参数+提案 accept=confirmed+筛选（API 交集+UI 组 chips）；实测全链通（vitest 198+1skip/199）。设计见 META_TAG_SYSTEM_V1.md。后置：tag 层级/confidence/组管理/云同步。
> Prior: G2 三端采集闭环完成（D-103，2026-11-23）**：/api/ingest/batch 分组入料 + gsc-push CLI + opencode 插件/codex notify/WorkBuddy skill（已扩写）+ 归块 cluster 提案（同名归并语义）+ G3 矩阵。WorkBuddy 真链实测通（幂等/命名/归块），实测修 2 bug（LLM 包壳契约、幻觉 id FK 守卫）。验收补跑（D-104）：codex 链全通（链式派发器+真实 rollout）· opencode 插件双加载器适配加载干净·无头 exec/run 环境挂死留真轮末触发。
> Prior: LOCAL_SIM 云端同构采集模拟完成（D-101，2026-11-23，剩 compose 起套门）**：docker-compose（db/api/worker+四卷=云部署文件）+ schedules 调度器 + 文件夹/爬虫适配器 + 独立 dashboard（8790，D-102 不进 GSC 页面）+ 桌面 bats/start-gsc-dashboard.bat 启动器；实测两条采集链通（folder 1/1、web 2/2+留档）。⏳ 待用户启动 Docker Desktop 跑 compose up/down/up 门。事故：PGlite 被强杀损坏→新库 .data/pglite-v2（残骸保全，详见 KNOWN_ISSUES）。
> Prior: 创始人目标已拆解（D-100，GOALS_2026-11-23.md）**：G1 组件拆分+component-list.md（最高，已出 v1）→ G2 三端采集闭环（opencode/codex/workbuddy 分组上传→Agent 分块，这两天）→ G3 插件兼容矩阵（这两天）→ G4 原始信息缩放+语义标题 / G5 Meta-tag v1.0 / G6 信息模型 v1.0（本周）。提案制不变，分块=提案。已落地（D-101）：Settings › 连接 MCP 接入卡片（4 客户端配置片段 + 9 工具清单 + /api/meta/mcp），G2 三端接入配置面就绪。
> Prior: P1 提案面治理完成（D-099，2026-11-23）**：detector 去重键错配根修（洪峰主因）+ 命名聚合（12→2）+ 采集自动重试（退避 3 次）+ UI 折叠（12 行→3 组）+ 存量清理（pending 497→255、0 重复），vitest 182+1skip/183。遗留 P2：批量裁决 UI（后置）。并行线：U2 collections 合并待执行；BACKEND_OPTIMIZATION 批次推进中（D-096 已拍部署/错误格式/SLO）。
> Prior: Phase 07 COMPLETE（2026-11-23，D-089..091/095/097/098）**：M1 痕迹 → M2 多投影 → M3 归因提案 → M4 空间工作台 → M5 双场景闭环（归因对账 7/7 PASS、写账本 32+80+6 笔可数、零副本实证）；三感觉落点齐（Ream 痕迹/Huabu 圈定/CLEO 归因）。遗留 P1：提案堆积（detector 噪声+管线按 chunk 命名单目标 12 条）、采集无自动重试。并行线：UI/后端优化计划（D-092…D-094/096）批次 C U1/U3 已落地（79fb666），U2 collections 合并待执行；新计划 `BACKEND_OPTIMIZATION_PLAN.md`（jeffallan/claude-skills 四视角）：批次 A 地基（DB-1 适配器验收挂起 docker、DB-2 版本表、SEC-2 生产门，D-096 三默认裁决）+ 批次 B 基线（D-097：1k/10k 压测 + EXPLAIN 入 docs/，DB-4 改写 listItemsPaged 全表内容加载与 q 页内过滤 → 10k list p50 686→167ms 回 SLO）已执行完（0501d86）；剩批次 C/D（API 分页/契约 + SRE/SEC），search 端点全表扫描超 SLO 待与 GAP-14 一并裁。

## User approvals received 2026-11-16

1. Enter Phase 01 (documentation only; no implementation code).
2. Local persistence: Docker PostgreSQL (`DECISION_LOG.md` D-004 → `DECIDED`).
3. Recommended stack confirmed (`D-005` → `DECIDED`).
4. UI placement: standalone app + Overview-style section (`D-010` → `DECIDED`).
5. "开始执行Phase 02" — enter Phase 02 (interaction design + UI prototype; still no persistence code).
6. "开始执行" — approve D-022…D-025 and execute Phase 03.
7. "开始执行" — approve Phase 04 plan (D-027…D-029) on 2026-11-19.
8. "制定计划，实现这个UI（记得把截图保存下来）" — 2026-11-19: plan + implement the new UI from four screenshots; D-030…D-035 recorded; former Phase 05 (evaluation) renumbered to Phase 06.

## Completed work

- Phase 00: repository and Thylas audit; 12 documents created; report delivered.
- Phase 01: information model finalized; 4 model/taxonomy documents.
- Phase 02:
  - `MVP_USER_FLOWS.md` — 8 workflows (F1–F8), 4 scenario walks, navigation hierarchy
  - `MVP_UI_SPECIFICATION.md` — screens S1–S7, tokens, components, closed UI decisions
  - `ui-prototype/index.html` — self-contained interactive prototype, in-memory only
  - D-019/D-020/D-021 closed the three Phase 01 UI questions

## Decision labels in use

`DECIDED` · `PROPOSED` · `OPEN` · `DEFERRED`. Never upgrade `PROPOSED` to `DECIDED` without user confirmation.

## Verified facts carried into Phase 03

- Thylas has GSC only as one manifesto file: `docs/product/gsc/MANIFESTO.md`. No GSC code, route, store, section, table, or API exists there.
- Thylas stack: Vite 6 + React 19 + React Router 7 + TypeScript 5.7 + CSS Modules + design tokens; no Tailwind, no UI kit, no state library.
- Thylas backend: `node:http` thin server, shared `createApiRouter()`, Drizzle ORM + `pg`, PostgreSQL dialect, 3 tables, no pgvector.
- API contract pattern: `src/lib/<domain>.ts` shared by server and client; TS types + small shape-check functions; no zod.
- Local environment: Node v22.22.2, Docker 29.1.5 available; no reachable PostgreSQL; no container started.
- Prototype verified at 1440×900 via headless Chrome: Library, New form, and Contexts screens render without overlap.

## Phase 03 completed (2026-11-18)

Implemented app, shared contracts, `node:http` API, Drizzle schema, PGlite persistence, repositories, CRUD, relations, provenance/history, file import, filters, tests, API smoke and UI screenshots. Verified: check/test/build pass; 16 tests; 4 tables; restart persistence. Docker daemon unavailable → PGlite fallback `D-026`.

## Phase 04 completed (2026-11-19)

Implemented P4-0…P4-4. `contexts` + `context_members` persist explicit Knowledge Context membership. UI supports create/edit context, add/remove members and opening member item detail. Verified: check/test/build pass; 20 tests; 6 tables; 10 API smoke checks; screenshots; restart persistence. `CONTEXT_VIEWS.md` defines the Context Space vs View boundary.

## Phase 05 in progress (2026-11-19)

Plan: `PHASE_05_UI_PLAN.md` (P5-0…P5-6, milestones M1–M6). Requirements read literally from `ui-prototype/refs/`: light shell with the real sidebar list + Sync, Overview composer (models Deepseek/Rym), Canvas window (搜索或输入操作 / 画布预览 / 打开文件 Ctrl+O), page-switch mosaic animation, mouse dot-grid background with quality Off/Low/Medium/High/Max. Open questions Q1–Q4 in plan §7 have defaults taken.

## Next action after approval

User to pick from `DIVERGENCE_PLAN.md` §4 (priority order, D1 provider form, D2 delivery form), then write task cards for the chosen direction(s). Phase 06 (formerly 05) — execute scenarios A–D with observed results — stays gated on user approval.

## UI/backend optimization plan drafted (2026-11-23)

`UI_BACKEND_OPTIMIZATION_PLAN.md` (Status: `PROPOSED`) — architecture-deepening plan produced with the mattpocock/skills improve-codebase-architecture + codebase-design method (deep-module vocabulary). Candidates: B1 route handler pipeline, B2 authorize module (fixes list-level IDOR on GET /api/contexts|clusters|sources), B3 updateItem transaction, U1 client data layer (25× try/catch + hand-picked invalidation), U2 collections merge + URL filter state, U3 ItemFields vocabulary, U4 flaky test baseline (vitest 138/140 wobbles). Batches: A (U4→B3) → B (B1→B2) → C (U1→U3→U2). Open decisions: ordering vs Phase 07 V4 (V3 itself landed 2026-11-23 as D-091, no conflict), hide-vs-forbid policy, soft-delete scope. Awaiting user pick.

## Registration receipt demo completed (2026-11-22)

`RECEIPT_DEMO_PLAN.md` + D-089: self-written `ReceiptPrinter` (出纸 + 可撕下收据, zero new deps, per user「不要API Key，你自己写效果」; React Bits Pro install path reverted). Create-account flow prints a registration receipt (name/email/identity/time/order/barcode), tear off or Continue → workspace. Verified end-to-end via `scripts/shot-receipt.mjs` (4 screenshots). Gotcha: sheet in-flow text needs `z-index:1` over the paper-SVG frame.
