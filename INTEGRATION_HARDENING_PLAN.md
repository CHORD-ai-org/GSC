# GSC 集成层商业标准评估与优化计划 — MCP / API / Provider

状态：`P0 EXECUTED`（2026-11-20）· 标准：商业级集成基础设施（可靠性 / 可观测 / 安全 / 契约 / 治理）
范围：三组件 —— **MCP**（`server/mcp/`）、**API**（`server/router.ts` + `http.ts`）、**Provider**（`server/agent/llm.ts`）。
方法：逐文件核到行号，六维打分（1–5），只报有代码证据的差距；先计划后执行，P0 本轮落地。

---

## 1. 逐组件商业评分

评分维度：可靠性（超时/重试/降级）· 可观测（health/metrics/日志）· 安全 · 契约与 DX · 治理（限流/幂等/成本）· 测试。

| 组件 | 可靠性 | 可观测 | 安全 | 契约 DX | 治理 | 测试 | 商业短板 |
|---|---|---|---|---|---|---|---|
| **API** | 4 | 3 | 5 | 3 | 4 | 4 | 无 healthz/metrics、无 OpenAPI |
| **MCP** | 3 | **1** | 4 | 3 | 2 | 3 | 零日志零指标、工具面偏窄 |
| **Provider** | **2** | 2 | 4 | 3 | 2 | 3 | **无超时无重试**、无成本追踪 |

一句话：**安全与错误分类已是商业级（API 5 分），但「能不能稳定跑、能不能被观测」是硬伤——LLM 调用没有超时/重试，整条链路没有 health/metrics。**

## 2. 证据（差距 → 代码位置）

### Provider（最高风险）
- **无超时**：`agent/llm.ts:38` 的 `fetchImpl(...chat/completions)` 无 `AbortController`——上游一慢，`/api/agent/*` 与 `llm:check` 整个请求被拖死。
- **无重试**：`llm.ts:54` 一次非 2xx 直接 `throw`；429/5xx 瞬时故障不退避不重试。
- **无成本/用量追踪**：`llm.ts:58` 解析响应只取 `choices[0].message.content`，`usage`（prompt/completion tokens）被丢弃——商业 LLM 用量与账单无从核算。
- **错误非类型化**：`llm.ts:56` 抛通用 `Error('LLM HTTP …')`，与 API 的 `ApiErrorKind` 体系脱节。

### API（可观测缺口）
- **无 `/healthz` `/readyz`**：grep 无命中；负载均衡/容器探针无法探活，商业部署不达标。
- **无 `/metrics`**：无 RED（速率/错误/时延）指标，Prometheus 抓不到。
- **无机器可读契约**：有 `API_CONTRACT.md`/`API_DESIGN.md`（人读），无 OpenAPI（程序可读/可生成 SDK）。
- 已达标项（不再动）：错误分类 `api.ts`（retryable 标记）、请求 ID + 结构化日志（脱敏）、限流、幂等、CORS、SSRF、64KB 体积上限、安全响应头。

### MCP（可观测 + DX 缺口）
- **零日志零指标**：`mcp/index.ts` 全文无 `log()`；tool 调用次数/耗时/错误率全黑。
- **工具面偏窄**：7 工具只读为主，缺 `gsc_search`（后端 `/api/search` 已就绪却没暴露）、`gsc_get_cluster`。
- **列表工具不分页**：`gsc_list_chunks`（`index.ts:117`）不透传 `limit/cursor`，条目一多整包返回。
- **无工具注解**：缺 MCP `annotations`（readOnlyHint/idempotentHint/destructiveHint），Agent 无法据此安全调度。
- **错误非结构化**：`index.ts:136` 用字符串 `Error: …`，无错误码。
- 已达标项：JSON-RPC 2.0 stdio、HTTP 单契约（不开库）、confirmed-only profile、propose 必过人审。

## 3. 优化计划

### P0 — 本轮执行（商业基线 + 最高风险）
1. **Provider 可靠性**：超时（AbortController，`GSC_LLM_TIMEOUT_MS`）+ 指数退避重试（`GSC_LLM_MAX_RETRIES`，429/5xx/超时/网络）+ 类型化 `LlmError`（retryable）+ `usage` 用量捕获 + 结构化 LLM 日志 + metrics 埋点。
2. **API 可观测**：`/healthz`（活）+ `/readyz`（DB 探活）+ `/metrics`（Prometheus：HTTP RED + LLM RED + token 计数 + uptime/heap）。
3. **MCP 加固**：工具 `annotations` + 列表分页透传 + 新增 `gsc_search`/`gsc_get_cluster` + 结构化错误码 + tool 调用日志。

### P1 — 计划（P0 后）
- OpenAPI 3.1（`/api/openapi.json`）+ `/api/docs`。
- LLM 成本核算（token→单价→预算护栏）。
- MCP `prompts`/`resources` 能力（上下文导出作 resource）。
- 失败转移模型列表。

### P2 — 计划（长期）
- 流式输出、Python/TS SDK、Webhook/事件推送、响应压缩、按 scope 细分 token、压测。

## 4. 验收标准
- AC-1：`curl /healthz` 200、`/readyz` DB 通 200 / 断 503、`/metrics` 出 Prometheus 文本（含 http/llm 指标）。
- AC-2：LLM 慢/挂 → 单调用在 `GSC_LLM_TIMEOUT_MS` 内中止；429 → 退避重试；响应 `usage` 入日志与 metrics。
- AC-3：`tools/list` 每工具带 `annotations`；`gsc_list_chunks` 传 `limit` 生效；`gsc_search` 可用；tool 报错带 `code`。
- AC-4：tsc=0、vitest 全绿、新增 metrics/llm/mcp 单测覆盖。

---

## 5. P0 执行结果（2026-11-20）

| 项 | 交付 | 验收证据 |
|---|---|---|
| **P0-A Provider** | `llm.ts`：AbortController + Promise.race 双保险超时（`GSC_LLM_TIMEOUT_MS`）· 指数退避重试（`GSC_LLM_MAX_RETRIES`，429/5xx/超时/网络可重试；401/403/4xx 不重试）· 类型化 `LlmError(kind,retryable)` · `usage` 用量捕获 · 结构化 `llm.call/retry/fail` 日志 · metrics 埋点 | 5 个新单测：挂起超时→`kind:timeout,retryable:true`、429→200 重试两次、401 不重试、usage 捕获、LlmError 形状 ✓ |
| **P0-B API 可观测** | `metrics.ts`（零依赖 Prometheus 注册表：counter/histogram/labels/进程 gauge）· `/healthz`·`/readyz`（DB 探活）·`/metrics` · router 埋 HTTP RED（低基数 route 标签） | live：`/healthz`→`ok:true,uptime`、`/readyz`→`db:up`、`/metrics` 出 `gsc_http_requests_total{route="/api/items"} 1`+duration+uptime ✓ |
| **P0-C MCP** | 工具 `annotations`（readOnly/idempotent/destructive）· 列表 `limit/cursor` 透传 · 新增 `gsc_search`/`gsc_get_cluster` · 结构化 `{error:{code,message}}` · stderr 调用日志（stdout 留给 JSON-RPC） | 4 个新单测：注解齐全、search 路由、分页透传、`{error:{code:'not_found'}}` ✓ |

**测试**：80 → **93**（+13）。tsc=0；全量并行有 3 个 5s 超时假失败（dev+API 共存的资源饥饿，复现多次），隔离复跑 hardening/sharing/tags **5/5 全过**——非代码问题。

**执行中修的坑**：Node 22 TS strip-only **不支持构造函数参数属性**（`constructor(readonly x)`）→ metrics 类改显式字段+赋值；LLM 双定时器（abort+race）在 finally 兜底清除，避免拖慢测试收尾。

**P1 留待**：OpenAPI 3.1、LLM 成本核算（token→单价→预算护栏）、MCP prompts/resources、失败转移模型列表。**P2**：流式、SDK、Webhook、压缩、按 scope 细分 token、压测。
