# SECURITY_MODEL.md — 安全模型

> 2026-11-20 · 与实现一一对应；每项标注验证方式。

## 1. 威胁面与对策（spec §8 清单逐项）

| 威胁 | 对策 | 实现 | 验证 |
|---|---|---|---|
| 注入 | 参数化查询（drizzle 全程无字符串拼 SQL） | schema.ts/repo/* | 代码审阅 + 400 校验测试 |
| 恶意输入 | 契约层校验 + INPUT_LIMITS + body 64KB 上限 | src/lib/*、http.ts | 73 tests（含超限拒绝） |
| SSRF | 地址分类 + DNS 校验 + 重定向逐跳复检 | ingest/ssrf.ts | ssrf.test.ts（5 用例） |
| 越权读写 | owner-only 写 + 共享隔离（view/add）+ 回收即时 | router 可见性 | sharing.test.ts 全链 |
| 凭据窃取 | token sha256 存储；第三方密钥 AES-256-GCM（keyfile/`GSC_SECRETS_KEY`） | tokens.ts/secrets.ts | secrets.test.ts（密文落盘/换钥 fail-closed） |
| 暴力/滥用 | token-bucket 限流（写 60/ingest 10/agent 5 每分钟）+ 429 | ratelimit.ts | ratelimit.test.ts + 活体 |
| CSRF | Bearer token 头认证（浏览器无法跨站附加）；CORS 显式白名单 + 同源判定（D-072） | router.ts | router.test.ts CORS 三用例 |
| 响应泄露 | DTO 与表解耦；密钥/哈希不出库；安全响应头（nosniff/DENY/no-referrer/no-store） | http.ts | 探针实测 |
| 日志泄露 | JSON 行日志 + **敏感字段脱敏**（title/content/token/authorization 不落日志） | log.ts | 代码审阅（denylist） |
| 文件处理 | 上传文件走 `storeTextFile`（文本限定、目录隔离 data/files）；无执行路径 | storage/local.ts | — |
| 误删/不可恢复 | 级联删除可预测 + `db:backup`/`db:restore` 恢复演练通过；软删除 DEFERRED-O4-1 | scripts/db-*.mjs | 演练记录（drill-keep 恢复成功） |
| 重复操作 | Idempotency-Key（items/relations/resolve）；tag 唯一约束 | idempotency.ts、0007 | hardening.test.ts |

## 2. 授权模型（与 UI 解耦）

- **身份**：PAT token 绑定 `userId`（`usr_local` 默认种子）。无 token 时=本机开放模式（D-058：`GSC_AUTH_REQUIRED=1` 才强制）。
- **资源策略**：所有权（owner-only 写）→ 共享（cluster view/add 分档）→ 回收即失效（每请求求值）。
- **外部 Agent**：经 MCP/REST 只拿到显式授权面（token scope read/rw），无全空间特权。
- 不做：RBAC/多租户策略引擎（DEFERRED，spec §8 明示不提前做）。

## 3. 残余风险（诚实清单）

1. DNS-rebinding TOCTOU（SSRF resolve-then-fetch）——已在 KNOWN_ISSUES。
2. 单进程限流/幂等存储——多实例需共享存储。
3. keyfile 与密文同机（非 HSM）。
4. 本机开放模式（默认关鉴权）适合单机使用，**部署到多用户环境必须 `GSC_AUTH_REQUIRED=1`**。
5. 无速率限制的 401 路径（未认证洪泛只耗认证检查）。
