# REMAINING_WORK.md — 全项目未完成项统一清单（v2）

> 2026-11-21 16:00 二次整理 · 对照当前代码实际状态核实（多份计划文档已漂移，code wins）。
> v1 之后新完成：R3 T301/T302、产品化冲刺、Web Intel 采集 MVP、信息体验 C/D/E/F、
> 模型配置按供应商真实可用（D-084）、Start 下拉真实化（D-085）、登录页黑白配色。**127 tests 全绿**。

**v1 中已被代码证实完成（移出清单）**
- ~~T401 共享集群~~ → **实质完成**：shareCluster/listShares/revoke API + sharing.test.ts 多用户用例 +
  ClusterDetailView 共享面板（按名邀请 view/add 角色 + 撤销）已就位。仅剩概念教学卡（归入 P2）。

---

## P1 — 广发布前必修（按执行顺序）

1. **T402 Sync 调度器**：`frequency=hourly/daily/weekly` 字段在、**无调度器**。做后台调度循环
   （到点自动 sync、幂等、失败记 last_error、manual 不调度）。
2. **Lint / CI**（GLOBAL_OPT M2）：无 ESLint、无 CI。eslint 配置 + `npm run lint` + GitHub Actions
   （lint + tsc + test + build）。
3. **采集中心**（Web Intel §6.1）：采集任务列表 API（GET /api/capture）+ 任务/完成/失败/历史 UI。
4. **Light Up 三栏审阅工作台**（§5.4）：源面板 | 提案列表 | 提案详情 + 批量确认 + 键盘导航。
5. **Phase 06 价值验证**（DEVELOPMENT_ROADMAP）：场景 A–D 执行记录 + 五个评估问题回答（PROPOSED 未启动）。
6. **Notion/Drive/X full OAuth**（B3-1）：**外部阻塞**（需各平台开发者凭证），token 路径已真实可用，
   UI 已如实标注。等用户提供凭证后接入 —— 不可自主执行。

## P2 — 重要改进（P1 后依次执行）

7. OpenAPI 3.1 + `/api/docs`（集成加固 P1）。
8. LLM 成本核算（proposer/detector 用量计费展示）。
9. MCP prompts/resources + failover（集成加固 P1）。
10. 性能 N+1：owner 校验逐行查 → 批量解析；补 keyset 分页覆盖。
11. 对象语义布局（§4.3）：Concept/Decision/Methodology 详情各按语义字段排布。
12. Recently 区分（§4.6）：访问/创建/修改三分组（仅在访问历史真实存在时显示"访问"）。
13. 概念教学卡（GAP-08）：Raw/Objects/Clusters/Contexts 四概念对比 + 空态教学。
14. 骨架屏/loading（GAP-09）。
15. 批量操作入口（GAP-10）：列表批量打标入口过深。
16. 引用/复用（GAP-13）：详情页「引用此条到 Context/Cluster」快捷。
17. 详情页 a11y：pairChip span→button、成员增删去 getElementById。

## P3 — Vision / 远期（不阻塞，本轮不动）

- 语义/向量检索（GAP-14）· Context 粒度授权（GAP-15）· API SDK 生态（GAP-16）·
  跨设备/云端（GAP-17）· 部署态 PostgreSQL 适配。

## 文档漂移记录（待顺手修正）

| 文档 | 过期处 |
|---|---|
| `PRODUCT_GAP_REGISTER.md` | GAP-01/02/03/05/06 已修；GAP-04/07 已修（T301/T302）|
| `DECISION_LOG.md` D-079/080 | 标 PROPOSED，实际已执行 |
| `IMPLEMENTATION_STATUS.md` | 缺 D-079..085 |
