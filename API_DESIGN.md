# API_DESIGN.md — API 架构与约定

> 2026-11-20 · 端点明细见 `API_CONTRACT.md`（冻结面）；本文档讲**架构约定与边界**。

## 1. 分层（模块化单体，spec §5 认可）

```
transport   server/router.ts（HTTP 语义、鉴权门、限流、CORS、405）
application server/repo/*.ts（用例级操作，事务边界）
domain      src/lib/*.ts（契约类型、校验、纯规则）——前后端共享同一契约层
persistence server/persistence/*（drizzle schema、迁移、client）
external    server/sync/*（源适配器）、server/agent/*（LLM）、server/ingest/*（URL）
```

不拆微服务/不拆包：单进程模块边界清晰即可（spec §5「modular monolith 是有效且首选」）。

## 2. 稳定约定

| 约定 | 规则 |
|---|---|
| 版本 | `/api/v1/` 规范、`/api/` 别名；破坏变更=v2，v1 弃用期 ≥6 个月（D-060/O5-4） |
| 标识 | 稳定字符串 id（`raw_`/`obj_`/`clu_`/`ctx_` 前缀 + UUID），永不复用 |
| 成功形 | `{ ok: true, ...payload }`；创建 201；删除 `{ ok:true, deleted:true }` |
| 错误形 | `{ ok:false, kind, message, retryable }` + 语义状态码（401/403/404/405/409/413/429/500/502/503） |
| 校验 | 契约层 validate* 守卫（手写 TS，**不引入 Zod**——spec §5 明示）；超限=400 |
| 写安全 | 事务包多写点；`Idempotency-Key` 可选幂等；限流 429+Retry-After |
| 删除 | 级联删净（预测式）；备份可恢复；软删除 DEFERRED-O4-1 |
| 分页 | 当前全量返回（N≤千级实测 <5ms）；`limit/offset` DEFERRED-O5-1，加时**只增可选参数**，不破坏契约 |
| 排序/过滤 | `?type=&domain=&q=` 已有；扩展只加参数 |
| 不泄露 | 响应 DTO 与表结构解耦（repo 层 toDTO）；密钥/哈希不出库 |

## 3. 鉴权与授权（spec §7）

- PAT token（sha256 存 `.data/api-tokens.json`）：`read`/`rw` 两档 + 绑定 `userId`（D-058/D-061）。
- 授权=**资源所有权 + 共享策略**，与 UI 解耦：owner-only 写；共享集群 view/add 分档；回收即时生效。
- 外部 Agent 无「全 Context Space」特权（默认只读自己+被共享面）——MCP 工具面即最小暴露（D-059）。
- 未来：service credentials / integration scopes = token 表扩列（scope 细粒度归 C6-1），不改契约。

## 4. 消费方

| 消费方 | 通道 | 状态 |
|---|---|---|
| Web Dashboard | `/api/v1/`（同源，vite 代理） | ✅ 在用 |
| GSC MCP | stdio JSON-RPC → HTTP API | ✅ 7 工具 |
| JS SDK | `sdk/gsc.mjs` | ✅ 起步 |
| Codex / Claude Code | 经 MCP 或 REST + token | 协议层已验（真机接入待外部环境） |

## 5. 幂等设计（0007 新增）

`Idempotency-Key: <client-uuid>` 于写端点（POST /items、POST /proposals/:id/resolve 等）：
- 首次：执行并快照 `{status, body}` 到 `idempotency_keys`。
- 重放同 key：直接回放快照，**不重复执行**（不重复建条目/关系）。
- 同 key 不同请求体：409 `conflict`。
