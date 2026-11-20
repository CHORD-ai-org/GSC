# GLOBAL_OPTIMIZATION_PLAN.md — 全局优化计划（目标：后端可直接商用）

> Status: `M1 EXECUTED` — 2026-11-20（O1-1…O1-7 + O5-2，D-068…D-070 裁决）· 输入：`EVAL_PLAN_EXECUTION.md`（4.0/5，P1×3 + P2×6）+ 代码现状实测
> 原则：**先证据后动手** —— 每个任务卡带「现状证据 / 改什么 / 验收」三段；不空想需求。

---

## 0. 「可商用」门槛定义（本计划的 DoD 总纲）

一个后端可以直接商用 = 满足五条：

| 门槛 | 含义 | 现状 |
|---|---|---|
| T1 正确 | 错误语义正确（4xx/5xx 不撒谎）、写入原子、数据不丢 | ❌ 502/400 混乱、无事务 |
| T2 安全 | 鉴权语义正确、输入限额、SSRF/密钥有防护、CORS 显式 | ❌ SSRF 大洞、密钥明文 |
| T3 可观测 | 结构化日志 + request-id + health/metrics，出事能定位 | ❌ 全无 |
| T4 可运维 | 配置校验、优雅启停、备份/恢复、可换 PostgreSQL | ⚠️ 仅 PGlite |
| T5 可回归 | lint + 覆盖率门 + CI，改动有安全网 | ❌ 无 lint 无 CI |

**阶段**：M1 = T1+T2（P0）→ M2 = T3+T5（P0/P1）→ M3 = T4（P1）→ M4 = 前端与规模化（P2）。

---

## 1. O1 后端加固（P0，M1）—— 直接决定能不能商用

| 任务 | 现状证据 | 改什么 | 验收 |
|---|---|---|---|
| **O1-1 错误语义** | 畸形 JSON→502（`server/http.ts:43` JSON.parse 裸抛）；鉴权失败→400；错误方法→404 | JSON 解析包 typed error→400；鉴权 missing/invalid→**401**、scope 不足→**403**；方法不匹配→**405+Allow** | `eval-probe.mjs` 16/16 + 新断言；HTTP 语义表进 `API_CONTRACT.md` |
| **O1-2 输入限额** | 10k 字符标题被照单全收；仅 body 有 1MB 上限 | title ≤ 512、fields 值 ≤ 64k、单请求 tag 值数 ≤ 100；超限→400 `contract` | 边界探针（超限拒绝/上限内通过） |
| **O1-3 SSRF 防护** | `server/ingest/html.ts:48` fetch 任意 URL + `redirect:'follow'`，可打内网 | 禁私网/环回/link-local/元数据地址（含重定向后复检）、禁非 http(s)、DNS 解析后校验 | 单测：`http://127.0.0.1`、`169.254.169.254`、重定向跳内网全部拒绝 |
| **O1-4 写入原子性** | 全仓 0 处 transaction；createItem=items+content+events 三次独立写 | drizzle `db.transaction` 包多写点（items/cluster/proposal/tag 各创建路径）；失败整体回滚 | 单测：注入失败→无孤儿行 |
| **O1-5 速率限制** | 无 | 按 token/IP 的 token-bucket：写 60/min、ingest 10/min、agent 5/min；429 + `retryable:true` | 探针打满→429，松开→恢复 |
| **O1-6 密钥加密** | `.data/secrets.json` 明文存第三方 token | Windows DPAPI（`protect-local`）或至少 master-password AES；落盘密文+版本号 | 重启后解密回环；文件被读≠泄密 |
| **O1-7 CORS/安全头** | 0 处 CORS 处理 | 显式 CORS 白名单（默认同源拒跨域）、`X-Content-Type-Options`、`X-Frame-Options`、禁 Server 头 | 探针：跨域请求被拒；响应头齐全 |

## 2. O2 可观测与可运维（P0/P1，M2–M3）

| 任务 | 现状证据 | 改什么 | 验收 |
|---|---|---|---|
| **O2-1 结构化日志** | `server/` 0 处 console/log | JSON 行日志：ts/level/request_id/method/path/status/ms；错误带 stack；敏感字段脱敏 | 一次请求产生可 grep 的日志行 |
| **O2-2 request-id** | 无 | 每请求生成/透传 `X-Request-Id`，进日志与错误响应 | 错误响应含 request_id，可回查日志 |
| **O2-3 health/metrics** | 无 `/healthz` | `GET /healthz`（db+storage 探针）、`GET /metrics`（请求数/延迟分位/错误率，Prometheus 文本） | curl 两个端点返回实时值 |
| **O2-4 启停与配置** | 迁移全量重放（踩过坑）；config 仅部分校验 | 启动自检（迁移版本表、目录可写）、优雅关闭（drain+关库）、env 校验失败即拒启并报因 | 杀进程→无损；错配置→启动失败信息明确 |
| **O2-5 PostgreSQL 适配** | `@types/pg` 已装但适配器未写（D-026）；PGlite=单机 | `DB_ADAPTER=postgres` 实现（drizzle 同构）；迁移可对两种 adapter 跑 | docker postgres 起跑全量测试通过 |
| **O2-6 备份/恢复** | 无 | `npm run db:backup`/`db:restore`（导出 SQL+文件目录打包）；恢复演练 | 备份→删库→恢复→数据一致 |

## 3. O3 代码质量基建（P1，M2）

| 任务 | 现状证据 | 改什么 | 验收 |
|---|---|---|---|
| **O3-1 Lint/Format** | **无 ESLint/Prettier、无 lint script** | eslint（ts+react）+ prettier 一套；`npm run lint`/`lint:fix`；0 error 起步 | CI 绿；全仓一次性格式化提交 |
| **O3-2 覆盖率门** | 测试 49 项但无覆盖率数字 | vitest coverage；门线 server/** ≥ 85%、src/lib ≥ 80% | `npm run test:cover` 低于门线即红 |
| **O3-3 CI** | 无 | GitHub Actions：lint+check+test:cover+build+api:check（Docker postgres 服务） | PR 全绿才可合 |
| **O3-4 严格化清扫** | strict 已开，余量：noUncheckedIndexedAccess 未开、死代码未清 | 开 `noUncheckedIndexedAccess`/`noUnusedLocals`；清未用导出（如历史遗留 re-export） | check 0 错误 |

## 4. O4 前端质量（P1/P2，M4）

| 任务 | 现状证据 | 改什么 | 验收 |
|---|---|---|---|
| **O4-1 删除安全**（P2-1） | Delete 即物理删 | 确认弹窗 + 软删除 30 天回收站（`deleted_at`）+ 恢复 | 误删可恢复；探针：soft-delete 不出现在列表 |
| **O4-2 可访问性**（P2-4） | 语义色配文字 ✓；键盘/焦点未审 | 键盘全流可达、focus-visible 环、aria 标注、对比度 AA | axe 扫描 0 serious |
| **O4-3 错误边界/状态** | 部分操作无乐观反馈 | React ErrorBoundary、按钮 pending 态、失败 toast | 断网操作有可见反馈 |
| **O4-4 列表性能**（C5-1） | 全量渲染 | >200 行虚拟滚动；路由级 code-split | 1k 条目滚动 60fps |

## 5. O5 规模化与契约（P2，M4）

| 任务 | 现状证据 | 改什么 | 验收 |
|---|---|---|---|
| **O5-1 分页**（P2-6） | 列表全量返回 | `limit/offset` + total；SDK 同步 | 10k 数据集列表 p95 < 100ms |
| **O5-2 Detector 性能**（P1-3） | O(n²) 全对相似度 | 长度预筛 + simhash 倍桶 + 增量指纹 | 1k 条目 detect < 5s |
| **O5-3 幂等键** | POST 重试即重复建 | `Idempotency-Key` 头支持（写端点） | 同键重放→同一对象 |
| **O5-4 版本策略** | v1 冻结但无弃用政策 | API_CONTRACT.md 增补：破坏性变更=v2、v1 弃用期 ≥ 6 个月 | 文档评审通过 |
| **O5-5 压测** | 无 | k6/autocannon 基线脚本（读写混合） | 报告：吞吐/延迟分位入库 |

---

## 5.1 执行记录（2026-11-20，M1）

| 任务 | 状态 | 证据 |
|---|---|---|
| O1-1 错误语义 | ✅ | 401/403/405+Allow/400/413 入契约；eval-probe 15/15；router.test 5 新用例 |
| O1-2 输入限额 | ✅ | INPUT_LIMITS 常量 + 全部校验器；600 字标题 → 400 |
| O1-3 SSRF 防护 | ✅ | `server/ingest/ssrf.ts`：地址分类/DNS 校验/重定向逐跳复检；5 单测 + 路由严格模式测试 |
| O1-4 事务 | ✅ | createItem / resolveProposalApplying 包 drizzle transaction（67 tests 过） |
| O1-5 限流 | ✅ | token-bucket（写 60/ingest 10/agent 5 per min）；活体 429 + Retry-After 实测 |
| O1-6 密钥加密 | ✅ | AES-256-GCM + keyfile/`GSC_SECRETS_KEY`；旧明文兼容迁移；密文落盘实证 |
| O1-7 CORS/安全头 | ✅ | 白名单 + preflight + nosniff/DENY/no-referrer；活体验证 |
| O5-2 Detector 预筛 | ✅ | planComparisons 倒排索引 + 高频 token 剪枝；2 单测 |

未做（M2+）：O2-*、O3-*、O4-*、O5-1/3/4/5。

## 6. 里程碑与顺序

| 里程碑 | 内容 | 出口条件 |
|---|---|---|
| **M1 后端加固** | O1-1…O1-7 + O5-2（Detector 是 P1） | eval 探针 16/16+新增全过；SSRF/限额/事务有单测 |
| **M2 可观测+CI** | O2-1…O2-3 + O3-1…O3-3 | 任一请求可追踪；CI 绿 |
| **M3 部署就绪** | O2-4…O2-6 | postgres 适配全量测试过；备份恢复演练过 |
| **M4 发行门禁** | O4-1…O4-4 + O5-1/3/4/5 | axe 0 serious；1k 数据集压测达线 |

**建议执行序**：O1-1 → O1-3（两个 P1 修复打头）→ O1-4/2/5/6/7 → O3-1/2/3 → O2-1/2/3 → O2-4/5/6 → O4/O5。
**与 `EVAL_PLAN_EXECUTION` 对齐**：P1-1=O1-1、P1-2=O1-1、P1-3=O5-2；P2-1=O4-1、P2-2=O1-5、P2-3=O1-6、P2-4=O4-2、P2-5=O1-1、P2-6=O5-1。

## 7. 边界（沿用 DESIGN_BOUNDARIES，不扩大）

不做：微服务/分布式/消息队列、K8s 编排、企业 RBAC、自动扩容。PostgreSQL 适配是「可换库」不是「分布式」。

## 8. 待决策（3 个）

1. **PostgreSQL 部署形态**：Supabase 托管 / 自托管 docker / 先只做适配器不选型？（影响 O2-5 验收环境）
2. **密钥加密**：Windows DPAPI（随 OS 账号）还是 master-password（可迁移但多一步）？
3. **CI 载体**：GitHub Actions（需仓库 secrets）还是本地 pre-commit 先行？
