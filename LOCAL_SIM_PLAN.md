# LOCAL_SIM_PLAN.md — 云端同构模拟（定时采集 + 爬虫源 + 本地控制台）

Status: `PROPOSED` — 2026-11-23（v2，创始人修正：**完全按照云端的模拟来**）。
依据：创始人诉求（2026-11-23）——云端常驻的持续采集（定时/项目文件夹/数据源）在本地模拟，
专门临时 dashboard 启动/配置本地各种选项；数据源爬取用爬虫（X 只是比方）。
目标归属：G2 采集闭环的"持续性"底座 + G6 信息模型"积累"行为的验证环境。

## 0. 云端同构原则（本计划第一约束）

**本地模拟 = 云端部署的同构预演，不是简化版**。本地跑的就是云端那套拓扑，仅把「云主机」
换成本机：同一份 compose、同一进程边界、同一个真 PostgreSQL、同一卷布局、同一调度语义。
本地不允许出现云端没有的捷径（单进程大锅、PGlite 当生产库、内存态调度）。
PGlite 只留单测；**本地怎么跑，云上就怎么部署**（与 D-096 Docker 自托管 PG 一致）。

| 拓扑件 | 云端 | 本地模拟 |
|---|---|---|
| 数据库 | PostgreSQL 容器 + 卷 | **同一个**（compose db 服务） |
| API+Dashboard | api 容器 | **同一个** |
| 采集/调度 worker | worker 容器（capture/scan/crawl/scheduler） | **同一个**（独立进程，同镜像不同 command） |
| 存储卷 | pgdata / crawl / watch / secrets | 同名卷本地挂载（./data 对应） |
| 调度 | worker 内 scheduler tick | 同一实现，不做 OS cron 旁路 |

## 1. 目标（具体场面）

`docker compose up` 一键起整套（db/api/worker）→ 「本地控制台」页上点「添加文件夹」登记
`D:\github projects\GSC\docs`、间隔 5 分钟、启用——worker 的 scheduler 每 5 分钟扫一遍，
新文件入 Light Up 管道出提案；「添加网页源」贴 3 个 URL——定时抓取，`data/crawl/` 卷留档
原始 HTML；「立即运行」手动触发；队列区看任务状态。compose down/up 数据与调度全部存活。

## 2. Task card（七项）

1. **Purpose** 云端同构地验证持续采集：定时、可配、可视、可控——「信息随时间积累」
   （vision 2.2/3.2）在与云一致的拓扑上可验收。
2. **Scope** compose 拓扑（db/api/worker+卷）· schedules 调度注册表 · worker 内调度器 ·
   文件夹扫描适配器（增量只读）· 爬虫适配器（产物留档）· 本地控制台页 · 同构验收。
3. **Interacts** `docker-compose.yml`（新，云部署同源）· `server/persistence/migrations/
   0013_schedules.sql` + `schema.ts` · `server/repo/schedules.ts`（新）·
   `server/worker.ts`（新进程入口：capture+scheduler）· `server/intel/scheduler.ts`、
   `adapters/folder.ts`、`adapters/crawler.ts`（新）· `server/router.ts` 路由表 ·
   `src/views/localconsole.tsx`（新）。
4. **Does not own** 云主机采购/域名/TLS · 登录墙与反爬 · 浏览器扩展 · fs.watch 实时监听 ·
   邮件/IM 源 · 微服务化/队列中间件（worker 进程内队列即云端形态）。
5. **User flow** `docker compose up` → 控制台 → 添加文件夹/网页源 → 设间隔/开关 →
   worker 自动按点采集 → 条目走 Light Up 提案 → 「立即运行」→ 队列看状态 → compose
   down/up 演练一切照旧。
6. **Minimum** compose 一键起整套 + 一条 folder schedule + 一条 web schedule 全自动跑通 +
   控制台可增删改/启停/手跑 + 重启卷持久。
7. **Test method** vitest（调度到期/增量幂等/爬虫留档，PGlite 单测不变）+ 同构演练腿
   （compose up/down/up 断言恢复）+ 沙盒丢文件出提案 + 截图。

## 3. 文件夹布局（对齐云端卷）

- **被采集项目文件夹**：登记制，绝对路径存注册表；容器内以卷只读挂载（`watch-vols` 映射），
  扫描器只读，不搬家。
- **沙盒**：`data/watch/demo-project/`（对应 watch 卷，验收可清空）。
- **爬虫留档**：`data/crawl/<source-slug>/<date>/<hash>.html` + `meta.json`（crawl 卷）。
- **数据库**：pgdata 卷（compose 命名卷）；**不再用 `.data/pglite` 作为模拟库**。
- **调度运行日志**：`data/sim/`（卷；主数据在 DB 表）。
- **代码**：`server/worker.ts`（新入口）· `server/repo/schedules.ts` ·
  `server/intel/adapters/{folder,crawler}.ts` · `src/views/localconsole.tsx`。

## 4. 技术路径（分层）

### A. 同构拓扑（docker-compose.yml，新，与云部署同源）
三服务：`db`（postgres:16 + pgdata 卷 + DSN 环境变量——D-096 适配器 DSN 驱动）、
`api`（构建自 Dockerfile，跑 `server/index.ts`）、`worker`（同镜像 `server/worker.ts`）。
卷：pgdata / data-crawl / data-watch / data-sim。`.env` 注入 LLM key 与 DSN。
compose 文件即未来云部署文件（本地 VPS 直接用）。

### B. 数据层（0013_schedules.sql，逐列不用 JSONB）
`schedules(id, name, kind 'folder'|'web', root_path, url_list TEXT 换行分隔, interval_min,
enabled, status 'idle'|'running', last_run_at, started_at, owner_id)`。
扫描状态复用 `source_snapshots` contentHash 幂等（externalId=相对路径+hash）。

### C. 调度器（server/intel/scheduler.ts，新，跑在 worker 进程）
`runScheduler(db, config)`：每 60s tick——`enabled AND status='idle' AND (last_run_at IS NULL
OR <= now - interval_min)` → running → 执行 → last_run_at 回 idle；`running` 超 10min 僵死
回收（对齐 capture reclaim）。capture worker 与 scheduler 同挂 `server/worker.ts` 的
setInterval——**这就是云端 worker 的形态**，本地不做第二套。

### D. 文件夹扫描适配器（adapters/folder.ts，新）
递归扫 root_path（跳 .git/node_modules/dist），默认 .md/.txt/.json/.html（可配）；hash 增量
→ 走 `processSnapshot`（Light Up 提案 best-effort）；只读；单轮上限 200 文件。

### E. 爬虫适配器（adapters/crawler.ts，新）
逐 URL：SSRF 复用 `ingest/ssrf` → fetch（UA=GSC-LocalSim，间隔 2s）→ 留档 crawl 卷
（原始 HTML+meta）→ extract → processSnapshot。登录墙/403 记 last_error 不硬闯。

### F. 本地控制台（src/views/localconsole.tsx，新，dashboard 内标「临时」）
schedules 列表（名称/类型/间隔/开关/上次运行）+ 表单（添加文件夹/网页源）+「立即运行」+
capture_tasks 队列近况 + 近期运行日志。API：`GET/POST/PATCH/DELETE /api/schedules`、
`POST /api/schedules/:id/run`（路由表 RouteSpec，body:true + idem）。**它管理的就是云端
同构服务**，不是本地玩具的开关。

### G. 验收（同构门）
- `docker compose up` 一键起整套；`down/up` 后调度与数据全部存活（卷持久）。
- 沙盒丢 1 个 .md → ≤间隔周期自动入料出提案；重扫零重复。
- 网页源 3 URL → 条目入库 + crawl 卷留档齐全。
- 控制台增删改/启停/手跑全通；tsc=0 lint=0 vitest 全绿（+新）。

## 5. 不做（本期）

云主机采购/域名/TLS · 登录墙/反爬/代理池 · 浏览器扩展 · fs.watch · 邮件/IM 源 ·
K8s/队列中间件（worker 进程内队列即云端形态）。

## 6. 确认点

1. compose 三服务（db/api/worker）+ 四卷（pgdata/crawl/watch/sim）形态——同意？
2. PGlite 仅单测、模拟与验收一律 Docker PostgreSQL——同意？
3. 控制台并入主 dashboard 挂「本地控制台（临时）」入口——同意？
