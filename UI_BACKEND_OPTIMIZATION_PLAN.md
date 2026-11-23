# UI_BACKEND_OPTIMIZATION_PLAN.md — UI 与后端优化计划（架构深化）

Status: `EXECUTING` — 2026-11-23「开始执行」批准（三项待决策取默认：先本计划后 V4 / hide=404 / 软删除 items-only，见 D-092）。
批次 A（D-092）、B（D-093）已完成；批次 C：U1/U3 完成（D-094），U2 因并行 V4 写入冲突挂起待确认。
方法：mattpocock/skills `improve-codebase-architecture` + `codebase-design`（深模块口径）。
证据：git 热区（`App.tsx` 3 个月 20 改、`router.ts` 18 改）+ 2026-11-23 全仓走查，关键指控已逐条抽查到行号。
与既有计划关系：`GLOBAL_OPTIMIZATION_PLAN.md`（M1/M2 加固）已执行完，本计划是其后的**结构**优化。
Phase 07 V3（归因与提案面）已于 2026-11-23 执行完（D-091），B1 把 attribution 等新端点收编进管道即可；
下一功能批是 V4 空间（待 Q-E 档位拍板），与本计划 B/U 批次正交但同文件（App.tsx/collections.tsx），
先后见 §5 待决策。

## 0. 测量口径（一句话版）

- **module**：有 interface + implementation 的东西。**depth**：调用者每学一分 interface，能行使多少行为。
- **seam**：不改此处就能改变行为的位置。**locality**：修一处，全处生效。
- **deletion test**：删掉它，复杂度消失 = pass-through（浅）；散到 N 个调用者 = 它挣得了位置（深）。
- 本计划只干一件事：把「25 份 try/catch 拷贝」「40 个 if 路由块」「2 份 300 行列表」这类
  零 locality 的平铺，收进少量深 module。

## 1. 现场（先看场面）

| # | 场面（用户/运维真实遇到的） | 证据 |
|---|---|---|
| 1 | 开共享的那天，「上下文」「关联组」「来源」列表把别人的数据显示出来 | `server/router.ts:539-541` 等 3 处 GET list 无 owner 过滤，全表返回 |
| 2 | 删除一个条目后，关联组卡片里的成员数还是旧数字 | `src/app/App.tsx:491-512` deleteSelected 只刷 refresh+loadContextIndex，漏 loadClusterIndex |
| 3 | 点一次「导出」，活动记录里多出一堆「打开」 | GET 详情顺手写 opened 事件（`server/router.ts:446-450`），导出逐条 getItem（`App.tsx:666-669`） |
| 4 | 新建一条记录，浏览器实际发 1 + 50 + N 个请求 | `api.ts:179-191` 透明翻页 ≤50 请求 + `App.tsx:232-241` 逐 item getItem 拉关系；批量接口 `listRelationsFor`（`api.ts:207`）已存在但没人用 |
| 5 | 翻页底部的 total 数字骗人（把无权看的也算进去） | repo 按全集算 total/cursor（`repo/items.ts:70-109`），router 事后 filter（`router.ts:384-407`） |
| 6 | 加一个字段要改 4 个文件；`'Delete this item?'` 还是英文 | 字段词表 ×4：`repo/items.ts:20` / `App.tsx:59` / `detail.tsx:19` / `lib/items.ts:164`；`App.tsx:493` 硬编码英文绕过 i18n |
| 7 | 错误提示框里出现 `contract: ...` 机器词 | `api.ts:94-107` 把 ApiErrorKind 压扁成字符串再甩上屏 |
| 8 | 一次 crash 可能让条目「标题更新了、正文没更新」 | `updateItem`（`repo/items.ts:181-223`）连写 3 表无事务，而 151 行注释声称有 |

## 2. 后端候选（B1–B3）

### B1 路由 handler 管道（dispatch 表 + 共享守卫）· 推荐强度 Strong

- **Files**：`server/router.ts`（1389 行，40 个 if 块）、`server/openapi.ts`、`server/idempotency.ts`。
- **问题**：每条路由手抄 5 个惯用法（readJson→校验→鉴权→repo→错误映射），幂等写只包了 3 个端点
  （items/relations/proposals），contexts/clusters/tags 的 POST 都没包；`KNOWN_ROUTES` 是第二份
  路由声明，与 if-chain 无对齐测试。改错误语义 = 改 40 处。
- **改什么**：`register(pattern, methods, { validate, authz, idem, handler })` 一个管道 module，
  校验/鉴权/幂等/错误映射/指标全收进去。dispatch 表直接派生 `KNOWN_ROUTES` 与 openapi（后者已
  派生，是现成好样板）。幂等铺开到全部写端点。
- **验收**：router.ts 减到「管道 + handler 注册」；同键重放测试覆盖全部写端点；openapi 与 dispatch
  表有对齐断言；现有 eval-probe 16/16 + vitest 全绿。
- **Before → After**：`40×(校验+鉴权+幂等+错误映射)` 平铺 → `1 个管道 × 40 个 handler`（同行为，
  改策略只改管道一处）。

### B2 鉴权收拢 `authorize(viewer, resource, action)` + 作用域查询 · 推荐强度 Strong（含安全修复）

- **Files**：`server/router.ts:306-339`（闭包里的鉴权三件套）、`server/repo/*`、`server/authz.test.ts`。
- **问题**：鉴权 4 种形状并存；hide-vs-forbid 不一致（restore 藏存在性、PATCH item 暴露存在性）；
  场面 1 的列表级 IDOR 与场面 5 的 total 骗人同根——owner 过滤一半在 router 手写、一半没人写。
- **改什么**：单一 `authorize` 决策点（可单测，不再只能整路由驱动）；list 查询在 repo 层按 viewer
  作用域过滤（total/cursor 语义随之一致）；hide/forbid 策略定一条写进 `API_CONTRACT.md`。
- **验收**：新增多用户探针——B 用户 GET /api/contexts|clusters|sources 看不到 A 的数据；
  total 与可见条目数一致；`authorize` 单测覆盖 allow/deny/hide 三态。
- **与 ADR 关系**：不引入 RBAC（沿用 `DESIGN_BOUNDARIES.md`），只统一现有 owner/share 语义。

### B3 updateItem 补事务 + 软删除策略统一 · 推荐强度 Worth exploring（小改动，正确性）

- **Files**：`server/repo/items.ts:181-223`、`server/persistence/schema.ts`。
- **问题**：场面 8；软删除只有 items 有 `deleted_at`，其余 4 表硬删，策略不一致且无可换点。
- **改什么**：updateItem 三写包 `db.transaction`（注释已承诺，补齐实现）；软删除以「查询谓词
  module」单点化（4 处手写 `isNull(deleted_at)` 收一处），是否扩到其余表 → `DECISION_LOG.md` 待裁。
- **验收**：注入失败回滚单测（无半更新）；谓词单点后 grep `deleted_at` 只剩 1 处定义。

## 3. 前端候选（U1–U4）

### U1 客户端数据层 module（mutation 包装 + 失效单点 + 消 N+1）· 推荐强度 Strong（消 bug 率最高）

- **Files**：`src/app/App.tsx:150-241、425-916`、`src/services/api.ts`。
- **问题**：25 个 mutation 全是 `try{setError(''); await api.X; await loadY()}catch` 同形拷贝，错误是
  全局单字符串，页面一切就清空；写后刷新靠手挑（场面 2）；relationIndex 逐 item getItem（场面 4）
  且不知道 getItem 有写副作用（场面 3）。
- **改什么**：一个 `mutate` helper（错误 kind 不压扁成字符串、失败可分区显示）；「写后刷什么」的
  失效规则表单点化；relationIndex 改用 `listRelationsFor`；opened 事件挪到显式「打开详情」动作，
  纯读路径零副作用。
- **验收**：vitest+jsdom 新增编排层测试：删除条目后 clusterIndex 一定刷新；导出后 events 表无
  新增 opened；一次新建的网络请求 ≤ 3 个（探针断言）。
- **Before → After**：`25×try/catch + 25×手挑失效` → `1 个 mutate + 1 张失效规则表`。

### U2 collections.tsx 双份 300 行合并 + 过滤状态进 URL · 推荐强度 Worth exploring

- **Files**：`src/views/collections.tsx:261-559`、`src/app/routes.ts:19-25`。
- **问题**：RawCollection 与 ObjectCollection 逐段拷贝（toolbar/选择模式/四种渲染/窗口化）；
  过滤条件（q/type/dim）是本地 state，后退/分享丢过滤，`SavedViewsMenu` 是绕过缺口的补丁。
- **改什么**：共享 collection module（deletion test：现在删掉任一份，复杂度直接消失 = 两份拷贝都
  没挣得位置）；q/type/dim 接进 RouteState（parsePath/buildPath + 6 个路由测试是现成 seam）。
- **验收**：两视图共用一份 toolbar/状态机代码；带过滤的 URL 粘贴到新窗口还原同一视图；路由测试 +8。

### U3 ItemFields 词汇表 module + i18n 治理 · 推荐强度 Worth exploring（便宜，消持续税）

- **Files**：`repo/items.ts:20` / `App.tsx:59` / `detail.tsx:19` / `lib/items.ts:164` / `lib/strings.ts`。
- **问题**：场面 6、7。字段知识 4 份拷贝，加字段改 4 处；硬编码英文绕过翻译 seam；translate 缺 key
  静默回显 key，无覆盖断言。
- **改什么**：字段名单/标签/列映射收进 `src/lib/itemFields.ts` 单一 module（server 侧以契约导入）；
  界面文案全部走 `t()`；strings 补「key 覆盖」单测。
- **验收**：加一个测试字段只改 1 个 module；grep 界面英文残留 = 0；缺 key 在测试里红。

### U4 测试基线修复（flaky）+ 编排层测试设施 · 推荐强度 Strong（U1 的前置）

- **Files**：`server/scheduler/engagement` 相关用例（~4s 真实等待）、`package.json`。
- **问题**：2026-11-23 两轮 vitest 一红一绿（138/140 波动），时序敏感；前端编排层 0 测试设施。
- **改什么**：flaky 用例注入 fake clock 或缩短节流窗；补 vitest+jsdom 环境供 U1 验收。
- **验收**：连续 3 轮 vitest 全绿（140/140）；`npm run test` 稳定可作 CI 门。

## 4. 顺序与里程碑

| 批次 | 内容 | 出口条件 |
|---|---|---|
| A 先手 | U4（稳定测试基线）→ B3（事务补齐） | 3 轮全绿；无半更新单测过 |
| B 后端深化 | B1 管道 → B2 鉴权收拢（IDOR 修复在此批） | 多用户探针过；dispatch/openapi 对齐断言 |
| C 前端深化 | U1 数据层 → U3 词汇表 → U2 collections 合并 | 编排层测试过；网络请求 ≤3 断言过 |

依赖：U1 验收依赖 U4 的 jsdom 设施；B2 在 B1 之后做（管道里留 authz 钩子）。
每个候选开工前按 `AGENTS.md` §3 写七项任务卡入当批工作笔记。

## 5. 待决策（3 个，`PROPOSED` → 确认后转 `DECIDED`）

1. **与 Phase 07 V4 的先后**：`RESOLVED（实况）`——V4 与本计划 C 批实际并行开工（同一工作区两个
   会话）。U1/U3 已避开完成；U2（collections.tsx 300 行合并）与 V4 的 spatial 视图接线正面相撞，
   按变更纪律挂起，待 V4 收尾/提交后再执行。
2. **hide vs forbid**：无权访问统一「404 藏存在性」还是「403 明示」？影响 B2 与 API_CONTRACT。
3. **软删除扩面**：contexts/clusters/sources/tags 是否也上 `deleted_at`（回收站覆盖全对象），
   还是维持 items-only？

## 6. 执行记录（2026-11-23，批次 A）

| 任务 | 状态 | 证据 |
|---|---|---|
| U4 修 flaky | ✅ | 根因=集成用例并行冷启 PGlite 挤过 5s 默认超时（非时序逻辑）；`vitest.config.ts` testTimeout 20s；142/142 ×3 轮全绿 |
| B3 事务补齐 | ✅ | updateItem 三写包 `db.transaction`；`notDeleted()` 谓词单点；`server/repo/items.test.ts` 2 个注入回滚测试（兼兑现 O1-4 欠账） |

裁决已记 `DECISION_LOG.md` D-092（默认三项：本计划先于 V4、hide=404、软删除 items-only 暂不扩面）。

## 6.1 执行记录（2026-11-23，批次 B）

| 任务 | 状态 | 证据 |
|---|---|---|
| B1 路由管道 | ✅ | `server/pipeline.ts`（dispatch + fail/ok + 幂等/校验 per-method）+ `ROUTES` 表；`KNOWN_ROUTES` 由表派生（漂移结构性消失）；幂等铺开到全部写端点（例外仅 sync/llm-check，结构测试锁死）；openapi↔registry 对齐断言 |
| B2 鉴权收拢 | ✅ | `server/authz.ts` 单一决策点（canViewItem/visibleItemIds/clusterRole/itemWriteDenied）；hide=404/forbid=403 落地（PATCH/DELETE item、cluster 写、shares、members）；contexts/clusters/sources 列表 owner 过滤（IDOR 修复）；items total/cursor 合并进作用域查询（F8） |

意外收获（B1 抓到的实锤漂移）：`/api/items/:id/relations` POST|DELETE 在旧 KNOWN_ROUTES + openapi 有档、**无任何 handler**（打了必 405）——幻影路由已随派生表消失，META 同步删除。
验证：tsc=0 · eslint=0 · vitest **149/149**（31 文件，+7：pipeline 结构/幂等重放/多用户作用域/三态策略）· `api-checks.mjs` 12/12 · sharing 测试断言按 D-092 从 400 改 403。

## 6.2 执行记录（2026-11-23，批次 C）

| 任务 | 状态 | 证据 |
|---|---|---|
| U1 客户端数据层 | ✅ | `src/services/dataLayer.ts`（失效规则表 + mutation runner + 错误 kind→i18n key）；App 25 个 try/catch 收编（含 deleteSelected 漏刷 clusterIndex 的回归钉）；relationIndex 改 `listRelationsFor`（消 N+1）；contexts/clusters 列表带 member_ids（消加载器 N+1，repo 单批查询）；opened 显式化 `?trace=1`（纯读/导出零副作用）；错误按 panel/view 分区显示。11 新测试：新建 2 请求 ≤3、纯读无 opened、删除必刷 clusters |
| U3 ItemFields 词汇表 | ✅ | `src/lib/itemFields.ts` 单一 module（收编 4 份拷贝：repo fieldColumns、App/detail fieldLabels、multiline）；字段标签双语；表单硬编码英文全走 `t()`（form.*/confirm.* 37 键）；覆盖测试：zh/en 缺一即红、模板键越出词表即红。grep 界面英文残留=0（余 aria-label 与收据 demo 文案，属设计本意） |
| U2 collections 合并 + 过滤进 URL | ⛔ `DEFERRED` | 并行 V4 会话正在写 `collections.tsx`（spatial 视图接线）；300 行重构与其快照写回互相冲毁的风险实测已发生两次（App.tsx import 区被回写一次，已重打）。按 AGENTS.md 变更纪律挂起，待 V4 收尾后执行 |

U1 验收口径偏差记录：计划写的「vitest+jsdom 编排层测试」改为**纯逻辑 runner + fetch 桩**测试（同三条验收
全过），未引 jsdom——少一个依赖，符合「不追加依赖须记理由」纪律。
验证（U1+U3 合并）：tsc=0 · eslint=0 · vitest **167/167**（34 文件，+17）· 提交 `79fb666`（含并行 V4 在
api.ts/strings.ts 的零星行，同工作区所致，已在提交信息注明）。

## 7. 不做（沿用 DESIGN_BOUNDARIES，不扩大）

- 不引微服务/队列/向量库/图库；不换视觉基底与组件库；不动 Light Up 编辑器内部。
- 不为投影建存储（D-079）；不借本计划重定义任何产品概念。
- 不追加运行时依赖（vitest/jsdom 属测试设施，也须记入 DECISION_LOG 理由）。
