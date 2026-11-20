# BACKEND_CURRENT_STATE.md — Phase 00 后端实现审计

> 2026-11-20 · 全部结论来自代码/迁移/测试实测，非路线图推断。六要素格式评估每个拟改项。

## 1. 技术底座

| 项 | 实况 |
|---|---|
| 语言/运行时 | TypeScript（strict）+ Node 22 原生跑 TS（`node server/index.ts`），无框架（node:http 手写路由） |
| 数据库 | **PGlite**（Postgres 兼容 WASM，单文件）；drizzle-orm + drizzle-kit；`@types/pg` 已装但 **postgres 适配器未实现**（D-026） |
| 迁移 | 0000–0006 纯 SQL，启动时全量重放（幂等 `IF NOT EXISTS`），无版本表 |
| 测试 | vitest **71 用例 / 15 文件**：契约、repo、路由、共享、标签、agent、ssrf、mcp、限流、密钥、同步、切块 |
| API | 手写路由 32 端点，`/api/v1/` 规范前缀 + `/api/` 别名；错误 envelope `{ok:false,kind,message,retryable}` |

## 2. 领域结构实况（详见证据文档）

| 概念 | 表 | 关键约束 | 状态 |
|---|---|---|---|
| Raw/Object（item） | `items` + `item_content`（1:1，PK=item_id） | type/domain/origin 词表校验在契约层；FK 级联 | ✅ 稳定 |
| 关系 | `relations` | **edge 唯一索引 (kind,from,to)** | ✅ |
| 历史 | `events` | append-only（代码无 update/delete 路径） | ✅ |
| Context | `contexts` + `context_members` | 复合 PK 防重复成员 | ✅ |
| Cluster | `clusters` + `cluster_members` | 复合 PK 防重复；owner_id；多归属 | ✅ |
| Proposal | `proposals` | 状态机 pending→accepted/rejected；接受即应用（事务） | ✅ |
| Source | `sources` | 密钥**不入库**（`.data/secrets.json` AES-GCM） | ✅ |
| User/Share | `users` + `cluster_shares` + `cluster_share_events` | 复合 PK；审计行 | ✅ |
| Meta Tag | `tag_definitions` + `tag_values` | 定义受控（FK）；值含 scope/confirmed/owner_id | ⚠️ 无唯一约束（见 §4-2） |

## 3. 既有工程质量（M1 加固后）

事务（createItem/resolveProposalApplying）· 输入限额（INPUT_LIMITS）· 错误语义（401/403/405/413/429）· SSRF 防护 · token 限流 · 密钥 AES-256-GCM · CORS 同源修正（D-072）· 安全响应头。

## 4. 拟改项（六要素）

### 4-1 幂等键（Idempotency-Key）

1. **现状**：仅 CORS 头允许 `idempotency-key`，无任何实现。`POST /api/items` 重试=重复条目。
2. **限制**：spec §4「重复确认不得产生重复 Chunk」；网络重试/双击入库会产生重复。
3. **改进**：写端点支持 `Idempotency-Key` 头；`(key, endpoint)` → 首次响应快照，重放返回同一结果。
4. **迁移**：新表 `idempotency_keys`（0007）；无数据变更。
5. **兼容**：无头请求行为不变（完全向后兼容）。
6. **必要性**：spec 明文要求 + Light Up 入库是逐条 POST 的重试敏感面。

### 4-2 tag_values 唯一约束

1. **现状**：同 (definition, item, value, scope) 可重复插入。
2. **限制**：重复赋值无语义，污染 Profile 聚合与计数。
3. **改进**：0007 唯一表达式索引（`COALESCE(item_id,'')` 处理 Profile 无归属值）；repo 冲突→409。
4. **迁移**：先清既有重复（保留最早）再建索引；**数据保留**。
5. **兼容**：仅重复写变 409；前端打标不会产生重复。
6. **必要性**：数据完整性第一原则。

### 4-3 备份/恢复（删除与恢复语义）

1. **现状**：DELETE=物理删+级联；无备份工具。
2. **限制**：误删不可恢复（O4-1 计划的软删除在前端里程碑）。
3. **改进**：`npm run db:backup` / `db:restore`（SQL dump + data/files 打包）；恢复演练入验证。软删除保持 DEFERRED（O4-1）。
4. **迁移**：无（工具脚本）。
5. **兼容**：完全增量。
6. **必要性**：spec §8「可预测的删除与恢复语义」——恢复侧先立起来。

### 4-4 结构化日志 + request-id

1. **现状**：零日志语句；出错只能复现不能回查。
2. **限制**：spec §8 要求适当日志且不记录敏感内容。
3. **改进**：`server/log.ts` JSON 行日志（ts/level/req_id/method/path/status/ms）；`X-Request-Id` 透传进错误响应；**不记录 body/标题/内容**。
4. **迁移**：无。
5. **兼容**：仅新增响应头。
6. **必要性**：可靠性与安全审计基线。

### 4-5 不做（DEFERRED，附理由）

- postgres 适配器（O2-5/M3）：需要 docker 验证环境，单独立项。
- 软删除（O4-1）：影响全部查询面，归前端里程碑连 UX 一起做。
- 事件溯源/图库/向量库/微服务：spec §6 明令避免，无需求支撑。
- proposals 表级唯一：提议是人工审阅制品，Detector 层已有增量去重（`seen` 集合）。

## 5. 前端 API 依赖面

`src/services/api.ts` 封装全部 32 端点；前端不直接触库。破坏性面=契约层，已由 `API_CONTRACT.md` 冻结 + 49 项契约级测试保护。
