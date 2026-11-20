# Web Intelligence — Implementation Plan

> 最小可用 + 正确架构边界。每阶段独立可交付、可验证。约束：不建自主 Research Agent / 浏览器扩展 /
> 网站监控 / 微服务 / 通用工作流引擎；不重复 Light Up；不绕过 Proposal→Confirmation；不破坏现有功能。

## Phase 02 — 后端基础（数据源 + 提取）
- `server/intel/adapters/`：`types.ts`（`FetchedDoc`/`SourceAdapter` 契约）+ 注册表。
- 适配器：`web.ts`（URL）、`rss.ts`（RSS/Atom）、`file.ts`（markdown/text）、`github.ts`（复用 sync/github）、
  `notion.ts`/`drive.ts`/`x.ts`（需 token，走 `storage/secrets.ts`，真实 API 调用 + 清晰 unsupported）。
- `server/intel/extract.ts`：升级 HTML 提取为结构化（title/canonical/author/date/site/desc/main text + hash）。
- 迁移：`source_snapshots` + `capture_tasks`（`persistence/schema.ts` + migration）。
- `repo/snapshots.ts` + `repo/tasks.ts`：幂等 upsert、任务 claim/retry/回收。
- 验收：每 adapter `probe`/`fetch` 单测（fetch 注入，无外网）；SSRF/超大/content-type 边界测试。

## Phase 03 — Light Up 集成（整合）
- `server/intel/pipeline.ts`：Snapshot → chunk → `proposer.suggestForChunks` → `detector.runDetection` → `proposals`。
- 保留 provenance（`origin`/`source_label=sync:<kind>:<id>`/`source_item_id`）、machine vs confirmed。
- 幂等：同源同内容不重复提案（`content_hash` + `source_label` 去重）。
- 验收：提取内容产出可审阅提案；确认后落 items 且可溯源；重复采集不重复提案。

## Phase 04 — Dashboard 集成（同步与导出页）
- 数据源卡片墙扩展为多数据源真实可用（连接/`probe`/同步/状态/重试）；`SOURCE_KINDS` 加 web/rss/file。
- Web 采集入口：URL 提交 → `capture_task` → 阶段状态（Fetching/Extracting/Processing/Awaiting Review/Completed/Failed）→ 结果 → Light Up 审阅 → 重访历史。
- 真实状态，无假进度；空态/失败态/不支持态齐全。复用现有 Sync 页视觉与导出（`buildJsonExport`/`Markdown`/`AgentContext`）。
- 验收：完整旅程截图 + tsc 通过。

## Phase 05 — 验证 + 复盘
- tsc=0、vitest 全绿、build 通过、migration roundtrip。
- 安全：SSRF/私网/重定向越界/超大响应/错误 content-type/非法协议/不可达。
- 语义：有效静态页/重复 URL/URL 内容变更/worker 中断恢复/失败重试/Light Up 确认/重启持久化。
- 复盘：更新 `DECISION_LOG.md`，记录冲突与取舍。

## 里程碑
- **M1（本轮）**：Phase 02 数据源 adapter + extractor + 迁移（数据源真实可拉取、结构化提取）。
- **M2**：Phase 03 整合 pipeline 接通（提取→提案→确认）。
- **M3**：Phase 04 后台任务 + Dashboard。
- **M4**：Phase 05 验证 + 复盘。
