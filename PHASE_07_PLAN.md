# PHASE_07_PLAN.md — 多视角工作台（Malleable Context Space 落地 GSC）

Status: `PROPOSED` — 待确认后开工。2026-11-22。
依据: 创始人决策 2026-11-22（GSC 多视角，Ream 感觉 + Huabu 感觉）· `docs/research/malleable-context-space/`
（研究综合与开放问题）· layout 脑暴（互知三栏 / 空间 / 多投影 / 归因 + Ream 重绘 A/B）。

## 0. 目标（具体场面）

打开 GSC，能看到"谁动过什么"（蓝=你、橙=Agent 的活动条，逐文件积累）；同一批对象一键换
投影（列表 / 阅读 / 关系 / 时间线 / 空间）；在空间里拖几张卡摆好、圈选几项点「提交给
Agent」，结果以紫色提案卡落回画布，点「采纳」才进库。不是新建知识管理应用——是给现有
信息库加一层"工作台"。

## 1. 决策状态

| 项 | 状态 | 说明 |
|---|---|---|
| 多视角体系（含 Ream/Huabu 感觉） | `DECIDED` | 创始人 2026-11-22 |
| View=投影，不为投影建存储 | `DECIDED` | 既有纪律（D-079 先例） |
| 机器产物=提案，确认前非事实 | `DECIDED` | D-042 |
| 表征持久化档位 | `PROPOSED` | 建议 scratch/kept 两档先行（Q-E） |
| 过程模型（P/W/O/E/R） | `DEFERRED` | Phase 08 再议（Q-D） |
| 跨项目共享协议 | `OPEN` | 不阻塞 GSC 单侧（Q-F） |
| Passage 级痕迹 | `DEFERRED` | 本期只做对象级 |

## 2. 阶段（每段一个可验收的垂直切片）

### V1 痕迹层 —— 「谁动过什么」可见（M1）
1. **Purpose** 互知（Ream）的数据基础：活动痕迹真实积累、就地可见。
2. **Scope** engagement 事件（actor + action: open/read/edit/annotate/derive）；列表行双色
   活动条（蓝=你 / 橙=Agent）；详情页足迹行（「你 2 次 · Agent 5 次 · 最近 10:22」）。
3. **Interacts** `server/persistence/schema.ts`(events)、`server/repo/*`、`src/views/collections.tsx`、`detail.tsx`。
4. **Does not own** 不做 passage 级、不做注意力推断、不做痕迹权限（沿用 owner/share）。
5. **User flow** 打开「原始信息」列表 → 行尾一对蓝/橙条（长短=活动量）→ 点进详情见足迹行。
6. **Minimum** events 补 actor + 列表双色条 + 详情足迹一行。
7. **Test** vitest 事件读写 + 截图列表/详情。

### V2 多投影切换 —— 一份表征五种投影（M2）
1. **Purpose** 落实"多视角"决策：同一份数据换角度看。
2. **Scope** 统一视图切换器（列表/阅读/关系/时间线/空间占位）；时间线投影（events 派生）；
   关系投影（现有 relations 的图呈现）；筛选保存（saved views）。
3. **Interacts** `pages.tsx`/`collections.tsx`/`canvas.tsx`、`views.module.css`、saved-view 存储（本地起步）。
4. **Does not own** 不为投影建表；关系图≠图数据库。
5. **User flow** 列表顶部切「列表/关系/时间线」→ 同源即时换呈现；时间线按事件排布、关系图按显式边连线。
6. **Minimum** 切换器 + 时间线投影 + saved views。
7. **Test** 切换前后 API 数据快照一致（断言零副本）+ 截图。

### V3 归因与提案面 —— 谁改了什么（M3）
1. **Purpose** CLEO 教训（可见性≠协作）：编辑级归因 + 提案就地确认。
2. **Scope** 编辑事件带 actor（PATCH 落 events 区分 user/agent）；详情归因条（绿=你/紫=Agent
   计数）；详情内嵌提案行（采纳/拒绝/暂缓）。
3. **Interacts** `server/router.ts`(PATCH)、repo/events、`detail.tsx`、proposals UI。
4. **Does not own** 不做意图自动推断（CLEO 推断模块后置）；冲突合并 UI 后置。
5. **User flow** 详情正文绿/紫下划线标改动处 → 顶部「你 2 处 · Agent 3 处 · 2 条提案待确认」→
   提案行直接采纳/拒绝。
6. **Minimum** 归因事件 + 归因条 + 提案内嵌行。
7. **Test** 归因事件断言 + 提案流测试 + 截图（对齐 Layout 4）。

### V4 空间工作台 —— 圈定即上下文（M4，⚠️ 依赖 Q-E 拍板）
1. **Purpose** Huabu 感觉：摆位/圈选材料、圈定=任务边界、显式委派。
2. **Scope** 空间视图（拖放摆位、圈选分组）；「对选中 N 项提问」→ agent/propose；结果落回
   空间成提案卡。
3. **Interacts** 空间 view（复用 canvas.tsx 基建评估）、`agent/propose` API、contexts。
4. **Does not own** 墨迹（ink）暂不做；不做无限画布；不做自动结构重组。
5. **User flow** 空间视图拖 5 张卡摆位 → 圈选 3 张 → 底部「圈定：3 材料 → 提交给 Agent」→
   紫框提案卡（待确认）落到指示位置 → 采纳进库。
6. **Minimum** 摆位 + 圈选 + 委派 + 提案卡回落（scratch 档）。
7. **Test** 场景 A 闭环手动 + 端到端脚本。
- ⚠️ 开工前确认 Q-E 档位（建议 scratch/kept 两档先行）。

### V5 场景闭环验证（M5）
- Research Scenario A 全流程留证（仿 `scripts/phase06-scenarios.py`）：采集 → 对象 →
  圈定委派 → 提案 → 确认 → 溯源可查。验收口径写进 `MVP_EVALUATION.md` 附录。

## 3. 不做清单（全程有效）

- 不为视图/投影建表；空间邻近≠语义关系（显式边为准）。
- 不做向量库/图数据库、无限画布、自动抽取、自动结构重组。
- 机器产物永远提案（D-042）；痕迹权限沿用 owner/share（GAP-15 不在本期）。
- 过程模型、passage 级痕迹、ink、跨项目协议 → 后续阶段。

## 4. 执行前确认点

1. Q-E 档位：scratch/kept 两档先行？（V4 依赖）
2. V1→V2→V3→V4 顺序认可？（V4 可与 V3 并行，其余串行）
3. 验收方式：逐里程碑验收（M1–M5）还是完成后一次验收？
