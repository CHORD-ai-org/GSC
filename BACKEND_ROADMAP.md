# BACKEND_ROADMAP.md — 后端路线（spec Phase 口径）

> 2026-11-20 · 与 `GLOBAL_OPTIMIZATION_PLAN.md`（O 系列）互补：本文按 spec 阶段收口后端基础，O 系列管工程化纵深。

## Phase 00 — 仓库审计 ✅（2026-11-20）

`BACKEND_CURRENT_STATE.md`。零大改动，六要素评估 4 个拟改项。

## Phase 01 — 领域与数据库评审 ✅（2026-11-20）

`DOMAIN_MODEL.md` / `DATABASE_DESIGN.md` / `PROVENANCE_MODEL.md` / `API_DESIGN.md`。决策全部带 DECIDED/DEFERRED 标记（含：Chunk≠切块算法、Cluster 允许 raw+object 成员、Meta Tag 定义≠赋值）。

## Phase 02 — 核心加固 ✅（2026-11-20）

幂等键（items/relations/resolve）+ tag 唯一约束（0007，去重保最早）+ 备份/恢复（演练通过）+ 结构化日志/request-id（脱敏）。73 tests。

## Phase 03 — Cluster 后端 ✅（此前 PLAN-1，本轮核验）

测试证据：多归属/防重复成员/增删保留 Chunk/owner 共享（`router.test.ts`「manages clusters and multi-homed members」+ `sharing.test.ts`）。自动聚类不做（spec 明示）。

## Phase 04 — Meta Tag 基础 ✅（此前 PLAN-8，本轮核验）

三层模型（定义/赋值/作用域）+ 受控定义 + confirmed 治理 + 唯一约束。测试证据：`tags.test.ts` + `hardening.test.ts`。不做本体引擎。

## Phase 05 — API 就绪 ✅（核验 + 文档收口）

`API_DESIGN.md`/`SECURITY_MODEL.md` 成文；鉴权边界（read/rw + 所有权 + 共享）与 MCP 面已实测。遗留：真机接入实测（需外部环境）、token 细粒度（C6-1）。

## Phase 06 — 验证与交接 ✅（2026-11-20）

见 `IMPLEMENTATION_STATUS.md`「Backend Foundation checks」。

## 与 O 系列的衔接

| 后续 | 归属 | 时机 |
|---|---|---|
| postgres 适配器 + docker 验证 | O2-5 | M3 |
| 软删除 + 回收站 | O4-1 | M4 |
| 分页 / Detector 性能 | O5-1/O5-2（O5-2 已做） | M4 |
| 日志升级 metrics/healthz | O2-2/O2-3 | M2 |
| token 细粒度 scope | C6-1 | 共享扩展时 |

## 云端部署路径（2026-11-20 记）

**形态 A —— 单用户 VPS（今天就可上）**：Node 22 + 持久磁盘（PGlite 进程内文件库）即可跑全功能。
部署面：`npm run build`（前端 dist）→ `GSC_AUTH_REQUIRED=1 GSC_SECRETS_KEY=<secret> GSC_CORS_ORIGINS=https://你的域名` 启 `npm run api`（可加静态托管 dist）→ Caddy/Nginx 反代 + TLS → cron 跑 `npm run db:backup`。单用户/个人基础设施场景够用。

**形态 B —— 标准托管（M3 O2-5 后）**：`DB_ADAPTER=postgres` 接托管 PG（Supabase/Neon/RDS）或 docker compose（app + postgres）；多实例前需把限流/幂等存储换成共享存储（已在 KNOWN_ISSUES）。M2 的 healthz/metrics 是上线探针前置。

**顺序建议**：M2（healthz/metrics/lint/CI）→ 形态 A 上线 → M3（postgres）→ 形态 B。
