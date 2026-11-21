# REMAINING_WORK.md — 全项目未完成项统一清单

> 2026-11-21 整理 · 对照当前代码实际状态（而非文档字面），跨所有计划汇总。
> 标准：P0=旅程断裂 · P1=广发布前必修 · P2=重要改进 · P3=Vision/远期。

**已完成基线（不再列入）**：R1 身份（账户/引导/价值陈述）、R2 找回（搜索/分页/软删回收站）、
产品化冲刺（数据源 sync 真实化、IDOR/用户隔离、移动响应式）、Web Intelligence 采集 MVP（`/api/capture`+worker）、
信息体验重构 C/D/E/F（排版体系/源库/异步 worker/理解摘要）、路由、Canvas、暗色、i18n、MCP/API、后端加固 M1。
共 **120 tests 全绿**。

---

## P1 — 广发布前必修

### 路线图 R3「管得住」— Agent 与信任（GAP-04/07）✅ 已完成
- ~~**T301 Token/Agent 访问管理面**~~ **DONE**：`GET/POST/DELETE /api/tokens` + Settings→连接 Token 管理 UI（列表/创建/吊销，令牌仅显示一次）。已验证（create 返回明文、list 可见）。
- ~~**T302 信息演化语义**~~ **DONE**：`outdated` status + `superseded_by` 关系 + 详情页「已被替代/已过时」横幅 + 跳转替代项。

### 路线图 R4「连得通」— 协作与集成（GAP-08/11）
- **T401 Shared Cluster 真实可用**：多用户协作跑通（邀请=建用户，受限账户层）；概念教学卡（GAP-08）。
- **T402 Sync 完善**：`frequency=daily` 字段在但**调度器未跑**；范围控制。

### Web Intelligence / 集成
- **Notion/Drive/X full OAuth**（B3-1）：现仅 token 路径（真实可用）；官方浏览器 OAuth 未做。UI 须如实标注「用访问令牌连接」。
- **Full-async 采集**：`POST /api/capture` 现 inline（归属正确）；worker 作恢复网。完整「enqueue+立即返回+capture_tasks 加 owner_id」待做。
- **采集中心**（Web Intel §6.1）：采集活动面（任务/完成/失败/历史）。

### Light Up
- **三栏审阅工作台**（§5.4）：源面板 | 提案列表 | 提案详情 + 键盘导航 + 批量确认 UX（理解摘要/操作已就位，三栏布局待做）。

### 工程基建
- **Lint/CI**（GLOBAL_OPT M2 O3）：无 ESLint/Prettier、无 CI。`npm run lint` + GitHub Actions（lint+check+test+build）。
- **Phase 06 价值验证**（DEVELOPMENT_ROADMAP）：场景 A–D 执行记录、五个评估问题回答 —— **PROPOSED 未启动**（"证明预期价值"）。

---

## P2 — 重要改进

- **OpenAPI 3.1 + `/api/docs`**（集成加固 P1）。
- **LLM 成本核算**：proposer/detector 调用计费。
- **MCP prompts/resources + failover**（集成加固 P1）。
- **性能 N+1**：`visibleItemIds`/owner 校验逐行查 → 批量 owner 解析；部分调用未走 keyset 分页。
- **对象语义布局**（§4.3）：Concept/Decision/Methodology 各自详情布局（现共用 shell）。
- **Recently 区分**（§4.6）：访问/创建/修改（仅当访问历史被追踪）。
- **概念教学**（GAP-08）：四概念对比卡、空态内教学。
- **骨架屏/loading**（GAP-09）。
- **批量操作入口**（GAP-10）：列表批量打标入口过深。
- **引用/复用**（GAP-13）：详情页「引用此条到 Context/Cluster」快捷、导出带引用图。
- **详情页 a11y**：pairChip 是 span（应为 button）；成员增删用 getElementById（脆）。

---

## P3 — Vision / 远期（当前不阻塞）

- **GAP-14 语义/向量检索**（DESIGN_BOUNDARIES 不引向量库）。
- **GAP-15 Context 粒度授权**（Agent 只看指定 Context）。
- **GAP-16 API Provider / SDK 生态**：Python SDK、用量计费（PLAN-6 C 段）。
- **GAP-17 跨设备同步 / 云端账户**（本地优先正确；云端是部署议题）。
- **部署态 PostgreSQL 适配**（GLOBAL_OPT M3 O2-4..6）：PGlite 本地优先；managed/deploy 用 PG 适配 + 备份演练。

---

## 文档漂移（AGENTS.md §1：code wins，需记 KNOWN_ISSUES）

| 文档 | 过期处 | 实际 |
|---|---|---|
| `PRODUCT_GAP_REGISTER.md` | GAP-01/02/03/05/06 标为缺口 | 已被 R1/R2 修复 |
| `GLOBAL_OPTIMIZATION_PLAN.md` | O2-3 healthz/metrics 标 ❌ | 已实现（/healthz /readyz /metrics）|
| `IMPLEMENTATION_STATUS.md` | "下一步=Phase 05 场景"、缺 D-079..083 | 陈旧，需补近期 |
| `DECISION_LOG.md` D-079/080 | 标 PROPOSED | 已执行（Canvas/按钮审计已落地）|
| `plans/PLAN-1..8` | 标 PROPOSED | 已全部执行（见实施状态）|

## 未验证假设（`IMPLEMENTATION_STATUS.md` §5）
- Docker PostgreSQL 启动（现用 PGlite，D-026）。
- 部署用 PostgreSQL 适配器（未实现）。
- Phase 05 场景评估未执行（= Phase 06）。
