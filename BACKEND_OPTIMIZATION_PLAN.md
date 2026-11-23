# BACKEND_OPTIMIZATION_PLAN.md — 后端优化计划（证据驱动）

Status: `PROPOSED` — 2026-11-23，待确认后按批执行。
方法：jeffallan/claude-skills 的思考方式——① `/common-ground` 先暴露并核对隐藏假设；
② 上下文感知激活，把任务路由到领域专家 skill：`database-optimizer`（基线先行）、
`api-designer`（契约清单）、`sre-engineer`（SLO/黄金信号）、`secure-code-guardian`
（验证检查点）；③ 多技能工作流按「地基 → 基线 → 证据驱动改进 → 可靠性」链推进。
与既有文档关系：`GLOBAL_OPTIMIZATION_PLAN.md`（M1/M2 加固）与 `UI_BACKEND_OPTIMIZATION_PLAN.md`
（B1 管道/B2 鉴权/B3 事务已完）之后的**第三层**——性能/契约/可靠性，不重复已做项。

## 0. Common ground — 隐藏假设与核对结果

| 隐藏假设 | 核对（代码为准） | 结论 |
|---|---|---|
| 「后端还有可直接动手的性能优化点」 | 从未做过任何基线压测（O5-5 欠账）；无 EXPLAIN 数据 | 假设不成立。database-optimizer 第一条 MUST「先基线后优化」→ **第一步是建基线，不是调优** |
| 「数据库随时可换/可部署」 | `config.ts:10` 硬编码 `dbAdapter: 'pglite'`；`client.ts` 只有 PGlite | 部署态 PostgreSQL 适配未做（P3 欠账），真库在逃逸清单外 |
| 「迁移随便重放」 | 13 个迁移（0000–0012）无版本表，启动全量重放；KNOWN_ISSUES 写「≤10 可靠」 | **已越线**。迁移版本表从「量变时补」变为现在必须补 |
| 「契约已完备」 | OpenAPI 3.1 已有（`openapi.ts:195`）；但 contexts/clusters/sources/tags/proposals/news 列表**全量返回无分页**；版本/弃用政策无文档（O5-4） | 集合端点分页与版本政策是缺口 |
| 「安全项已清」 | M1 修了大头；剩：SSRF DNS-rebinding TOCTOU 窗口、密钥 keyfile 非 HSM、`GSC_INGEST_ALLOW_PRIVATE` 生产逃生舱 | 三个残留项都有 KNOWN_ISSUES 行号，收尾在本计划 |
| 「多实例可扩展」 | 幂等已落 DB 表（`idempotencyKeys`）✓；**限流是内存桶**（`ratelimit.ts:18` Map） | 限流多实例化是缺口（跟部署形态一起定） |

## 1. 现场（具体场面）

| # | 场面 | 证据 |
|---|---|---|
| 1 | 10k 条数据后列表变慢，但没人知道慢在哪——没有基线数字可对比 | 全仓 0 压测脚本、0 EXPLAIN 记录；`scripts/` 只有 db-backup/restore/probe-* |
| 2 | 迁移文件加到第 13 个，启动每次全量重放——哪天两条迁移互相干扰就是静默数据事故 | `migrate.ts:27` 无条件 `exec(migrationSql())`，无 schema_migrations 表 |
| 3 | 「上下文」页 500 个上下文时一次全量拉回，翻页没得翻 | `repo/contexts.ts` 的 `listContexts` 无 limit/cursor；clusters/sources/tags 同病 |
| 4 | 换台机器部署，Docker PG 起来了也没用——代码只会连 PGlite | `config.ts:10` `dbAdapter: 'pglite'` 唯一路径；`@types/pg` 装了没用上 |
| 5 | 出了事故只能翻日志猜：有 /metrics 直方图但没有 SLO、没有告警规则、没有演练 | `metrics.ts` 有 histogram ✓；无 SLO 文档、无告警配置、恢复演练是手工的（D-074 覆盖模式坑） |
| 6 | 两个实例一部署，限流就等于没有（每个进程各记各的） | `ratelimit.ts` 内存 Map；X-Forwarded-For 不信任也未配置化 |

## 2. DB 视角（database-optimizer + postgres-pro）

| # | 任务 | 改什么 | 验收 |
|---|---|---|---|
| DB-1 | 部署态 PostgreSQL 适配 | `DB_ADAPTER=postgres` 走 `drizzle-orm/node-postgres` 同构；迁移对两 adapter 都跑；配置校验缺 DSN 拒启 | docker postgres 起全量 vitest + api-checks 通过（D-026 兑现，P3 清单项） |
| DB-2 | 迁移版本表 | `schema_migrations` 表（filename+applied_at），启动只跑未应用项；旧库一次性收编现有 13 个 | 断言：二次启动 0 重放；人为插一条假版本号→对应文件跳过 |
| DB-3 | 基线压测 + EXPLAIN 基线 | 1k/10k 数据集读写混合压测脚本（autocannon，零新运行时依赖可用 node 自带 or devDep——**待裁**）；关键查询 `EXPLAIN (ANALYZE, BUFFERS)` 记录入 `docs/`；慢查询 Top 表 | 产出《后端性能基线》报告：吞吐/p95/慢查询清单/缓冲命中，入库留档 |
| DB-4 | 证据驱动的索引/查询改写 | 仅依据 DB-3 基线动手；**一次只改一个**，改后复测（skill 纪律：多改并行=无法归因）；批量改后 ANALYZE | 每项改动带 before/after EXPLAIN 与 p95 对比；无基线不动手 |

## 3. API 视角（api-designer）

| # | 任务 | 改什么 | 验收 |
|---|---|---|---|
| API-1 | 集合端点统一 cursor 分页 | contexts/clusters/sources/tags/values/proposals/news/users 列表统一 `?cursor&limit` + `next_cursor/has_more`（items 的 T202 是现成样板）；不破坏现有客户端（缺省全量→渐进） | 契约测试：每个集合端点 limit=2 翻页无重无漏；10k 数据 p95 达标（数值待 SRE-2 定） |
| API-2 | 错误目录 + 版本/弃用政策 | `API_CONTRACT.md` 补全 kind→status→语义目录（B2 的 404/403 政策已定，收编）；v1 冻结、破坏性变更=v2、弃用期 ≥6 个月（O5-4 兑现）；错误响应可选加 RFC 7807 `type` URI 字段（**待裁**，兼容保留 `{ok:false}`） | 文档评审通过；错误目录有契约测试逐类断言 |
| API-3 | OpenAPI 校验门 | CI 加 `npx @redocly/cli lint`（skill MUST：spec 必须 lint 过）；现有 openapi↔ROUTES 对齐断言保留 | CI 红绿可见；新增路由缺 spec → 红 |
| API-4 | SDK 类型生成 | `openapi-typescript` 生成类型替换手写响应类型（api.ts 的漂移面移交生成物）；运行时函数保留（U1 已收薄） | 生成类型与手写类型 diff=0 起步；之后改契约只改 spec |

## 4. SRE 视角（sre-engineer）

| # | 任务 | 改什么 | 验收 |
|---|---|---|---|
| SRE-1 | SLO/SLI + 错误预算 | 定量 SLO（可用性/读 p95/写不丢——**数值待用户给预期**，skill：不做无用户影响依据的 SLO）；多窗口烧钱率告警规则（Prometheus 规则文件）；错误预算政策（超支冻结非关键变更） | SLO 文档 + 告警规则文件入库；/metrics 指标可直接算 SLI |
| SRE-2 | 容量/压测基线 | 与 DB-3 共用脚本，补容量曲线（并发 10/50/200 下 p95）；定 API-1 的分页性能门槛 | 压测报告含容量拐点；门槛数字进 API_CONTRACT |
| SRE-3 | 恢复演练自动化 | `db:backup → 删库 → db:restore` 一键演练脚本 + RTO/RPO 实测记录（顺手修 D-074 覆盖模式的文档声明）；优雅启停验证 | 演练脚本 3 连跑通过；RTO/RPO 数字入 SLO 文档 |
| SRE-4 | 限流/幂等多实例化 | 限流桶落共享存储（随 DB-1 的 postgres 形态；PGlite 单机下保持内存）；`TRUST_PROXY` 配置化（X-Forwarded-For） | 双实例探针：两进程共享同一桶；trust-proxy 开关行为有单测 |

## 5. SEC 视角（secure-code-guardian 验证检查点）

| # | 任务 | 改什么 | 验收 |
|---|---|---|---|
| SEC-1 | SSRF TOCTOU 关闭 | resolve-then-fetch 改为**按解析 IP 定制 fetch agent**（连接目标锁 IP，Host 头保留原名）；重定向逐跳复检保持 | 单测：DNS 变更窗口内重放仍拒内网；KNOWN_ISSUES 该行销账 |
| SEC-2 | 生产配置门 | 生产 profile（无 `GSC_INGEST_ALLOW_PRIVATE`）下启动自检：逃生舱开启即拒启并报因；密钥 keyfile→DPAPI/主密码路径定型（沿 D-069 已选 AES+keyfile，补迁移文档） | 错配置启动失败信息明确；安全决策入 SECURITY_MODEL.md |
| SEC-3 | 安全回归探针进 CI | api-checks 补：限流触发（429）、越权横/纵（B2 政策 404/403 逐类）、安全头齐全、凭证不进错误响应（skill 验证检查点清单化） | CI 每次跑；探针清单进 API_CONTRACT 附录 |

## 6. 顺序与批次

| 批次 | 内容 | 出口条件 |
|---|---|---|
| A 地基 | DB-1 → DB-2 → SEC-2 | docker PG 全量测试过；迁移二次启动 0 重放 |
| B 基线 | DB-3 + SRE-2（同一脚本两个产出） | 《后端性能基线》报告入库 |
| C 证据驱动 | DB-4（按基线）→ API-1 → API-2/3/4 | 每项改动有 before/after；分页契约测试过 |
| D 可靠性 | SRE-1/3/4 + SEC-1/3 | SLO 文档+告警规则+演练记录+安全探针进 CI |

依赖：DB-1 是 DB-3/SRE-4 的前置；DB-3 是 DB-4 的前置（**无基线不动手**）。
每个候选开工前按 `AGENTS.md` §3 写七项任务卡入当批工作笔记。

## 7. 待决策（3 个，`PROPOSED`）

1. **部署形态**（GLOBAL 遗留待裁）：Docker 自托管 PG / Supabase 托管 / 先只做适配器？→ 决定 DB-1 验收环境与 SRE-4 共享存储选型。
2. **错误格式**：保持 `{ok:false,kind,message}` 只补文档，还是加 RFC 7807 `type` URI 字段（兼容叠加）？
3. **SLO 数字**：可用性（99.5/99.9%？）、读 p95（200/500ms？）的预期——按 skill 纪律，没有你的用户影响依据不拍数字。

## 8. 不做（沿用 DESIGN_BOUNDARIES）

- 不引微服务/队列/K8s/向量库；语义检索、跨设备云端是 P3 独立项不混入。
- 不动 UI（见 `UI_BACKEND_OPTIMIZATION_PLAN.md`，U2 仍待 V4 提交后执行）。
- 不为压测/生成引入运行时依赖；devDep 若引入（autocannon/openapi-typescript）记 DECISION_LOG 理由。
