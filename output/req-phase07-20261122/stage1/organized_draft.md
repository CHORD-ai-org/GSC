# GSC Phase 07 — 多视角工作台执行计划（整理稿）

> 状态：PROPOSED（待确认后开工）· 2026-11-22 · 依据：创始人决策 2026-11-22 · 研究集 docs/research/malleable-context-space/ · PHASE_07_PLAN.md · 决策记录 D-088

## 一、背景与决策

GSC 已完成 P0–P6 与 P1/P2 全部执行项（vitest 135/135 全绿），核心信息模型（Raw/Object 混合模型、提案→确认制、关系表、溯源）稳定。Malleable Context Space 跨项目研究（Ream / CLEO / IPI / Malleable Workspace / Inkitiate 五路论文）给出方向：把「表征→就地操作→归因变更→互相看见→反思改结构」做成一套工作台基底。

创始人决策（DECIDED）：GSC 要包含多种视角，同时具备 Ream 的感觉（参与痕迹局部可视化、双向可读的互知意识）与 Huabu 的感觉（空间工作台：选择/圈定即上下文边界、显式委派）。View 是投影不是数据模型（D-079 纪律延续）；机器产物确认前永远是提案（D-042）。

## 二、总体路线

V1 痕迹层 → V2 多投影切换 → V3 归因与提案面 → V4 空间工作台（依赖 Q-E 拍板）→ V5 场景闭环验证。V4 可与 V3 并行，其余串行。全程遵守：不为投影建表、不做向量/图数据库、不做无限画布、不做自动抽取与自动结构重组。

## 三、V1 痕迹层 —— 「谁动过什么」可见（M1）

（一）目标：列表行尾蓝/橙双色活动条（蓝=你、橙=Agent），详情页足迹行「你 2 次 · Agent 5 次 · 最近改动 10:22」。
（二）技术路径：events 补 actor/action（迁移 0014）；写入点 router 各 handler；聚合 activityCountsByItem 一次 inArray；API 列表附 activity；前端 ActivityBars；零 N+1。
（三）Layout 演示：![V1 痕迹层](D:\github projects\GSC\docs\research\malleable-context-space\figs\fig-v1-traces.png)
（四）验收：vitest 事件读写+聚合；截图；边界（对象级、无推断、沿用 owner/share）。

## 四、V2 多投影切换 —— 一份表征，多种投影（M2）

（一）目标：列表/阅读/关系/时间线/空间一键切换；切换零副本；保存筛选。
（二）技术路径：ViewSwitcher + TimelineView + RelationsView（SVG 固定分层布局）；GET /api/events 只读端点；saved views 存 localStorage；不为投影建表。
（三）Layout 演示：![V2 多投影](D:\github projects\GSC\docs\research\malleable-context-space\figs\fig-v2-views.png)
（四）验收：数据快照一致+零写请求断言；五投影截图。

## 五、V3 归因与提案面 —— 谁改了什么（M3）

（一）目标：正文绿/紫下划线标注改动；归因条计数；字段行尾编辑者圆点；详情内嵌提案行（采纳/拒绝/暂缓）。
（二）技术路径：PATCH 落 recordEvent(actor, changed_keys)；attributionByItem 聚合；详情响应附 attribution；提案行直连 /api/proposals/:id/resolve；diff 渲染与意图推断后置。
（三）Layout 演示：![V3 归因与提案](D:\github projects\GSC\docs\research\malleable-context-space\figs\fig-v3-attribution.png)
（四）验收：归因事件断言+提案流测试+截图；D-042 回归。

## 六、V4 空间工作台 —— 圈定即上下文（M4，依赖 Q-E 拍板）

（一）目标：拖放摆位、矩形圈选（虚线光晕=上下文边界）、「提交给 Agent」、紫框提案卡落回、采纳入库。
（二）技术路径：views/spatial.tsx（DOM+transform，非 WebGL）；scratch 档 localStorage.gsc.spatial.v1，kept 档新表 spatial_layouts（逐行坐标，不用 JSONB）；委派复用 POST /api/agent/propose；回落卡=pending proposals 渲染。
（三）Layout 演示：![V4 空间工作台](D:\github projects\GSC\docs\research\malleable-context-space\figs\fig-v4-spatial.png)
（四）验收：端到端摆位→圈选→委派→提案→采纳；零副本断言；开工前确认 Q-E。

## 七、V5 场景 A 闭环验证（M5）

（一）目标：采集→对象→圈定委派→提案→确认→溯源全流程留证，写入 MVP_EVALUATION.md 附录。
（二）技术路径：scripts/phase07-scenario-a.py（API 级五步留证+归因校验+零副本断言）；手动腿 UI 截图。
（三）Layout 演示：![V5 闭环](D:\github projects\GSC\docs\research\malleable-context-space\figs\fig-v5-loop.png)
（四）验收口径：功能五步全通；治理确认前无机器产物入库；零副本。

## 八、不做清单（全程有效）

1. 不为视图/投影建存储表；空间邻近≠语义关系（显式边为准）。
2. 不做向量库、图数据库、无限画布、自动抽取、自动结构重组。
3. 机器产物永远提案（D-042）；痕迹权限沿用 owner/share（GAP-15 不在本期）。
4. 过程模型（P/W/O/E/R）、passage 级痕迹、墨迹、跨项目协议 → 后续阶段。

## 九、执行前确认点

1. Q-E 档位：scratch/kept 两档先行（canonical 照旧走 Context/Cluster）。
2. 顺序：V1→V2→V3→V4（V4 可与 V3 并行）。
3. 验收：逐里程碑（M1–M5）vs 完成后一次验收。

## 十、里程碑总表

M1 痕迹层（vitest+截图）；M2 多投影（零副本断言+截图）；M3 归因提案（提案流测试+截图）；M4 空间工作台（端到端+零副本）；M5 闭环留证（全流程 id 留证）。
