# PHASE_07_V4_PLAN.md — 空间工作台（M4）执行计划

Status: `PROPOSED` — 待拍板 Q-E 后开工。2026-11-23。
依据：`PHASE_07_PLAN.md` §六 · 创始人决策（Huabu 感觉：圈定即上下文）· Layout 演示
`docs/research/malleable-context-space/figs/fig-v4-spatial.png`。V1–V3 已完成（D-089/090/091）。
**⚠️ 本阶段唯一外部依赖：Q-E 表征持久化档位拍板（见 §5 确认点 1）。**

## 0. 目标（具体场面）

空间视图里拖 5 张卡自由摆位；鼠标拉矩形圈选 3 张，虚线光晕=上下文边界；底部条「圈定：3 项
→ 提交给 Agent」。Agent 结果以**紫框提案卡**（待确认）落回各自目标卡旁：「重命名：注意力
→ 自注意力」「分类 → Methodology」，点采纳即生效、拒绝即落定、暂缓收起。摆位只是软编排
（零副本），语义关系仍走显式提案。

## 1. Task card（七项）

1. **Purpose** Huabu 感觉落地：选择/编排材料、圈定=任务边界、显式委派、结果就地可审（D-042）。
2. **Scope** 空间视图骨架（spatial 模式解禁）· 摆位持久化（scratch 档）· 矩形圈选 + 上下文条 ·
   委派链路（agent/propose → 命名/分类提案）· 提案卡回落（复用 V3 三键）· kept 档（Q-E 通过后
   可同批或下批）。
3. **Interacts** 新 `src/views/spatial.tsx` · `src/lib/prefs.ts`（spatial 摆位存取）·
   `src/views/collections.tsx`（spatial 分支解禁）· `src/services/api.ts`（propose/proposals 已有）·
   （kept 档）`server/persistence/schema.ts` + 迁移 `0014_spatial_layouts.sql` + `server/router.ts`。
4. **Does not own** 墨迹（ink）· 自动结构重组 · 无限画布（视口滚动即可）· 拖拽语义化
   （邻近→关系仅人工提案）· 自由问答式委派（现有 proposer 是命名/分类建议，见 §5 确认点 2）。
5. **User flow** 切换器点「空间」→ 卡片按存档坐标排布（无坐标者网格自动排）→ 拖卡摆位
   （实时存 scratch）→ 拖矩形圈 3 张（虚线光晕）→ 底部条「圈定：3 项 · 改边界 · 提交给 Agent」
   → 逐项产生紫框提案卡落在目标卡右下 12px → 点「采纳」→ 标题/分类即刻生效、事件流出现
   `via proposal` 紫迹（V3 归因链路）。
6. **Minimum** 空间视图 + scratch 摆位 + 圈选 + 委派 + 提案卡回落三键。
7. **Test method** vitest：委派到提案的 API 链断言（propose→createProposal→resolve 应用）；
   零副本探针（拖动/圈选仅触 localStorage 与 GET）；端到端手动腿截图（对齐 fig-v4）。

## 2. 技术路径（分层）

### A. 空间视图骨架（views/spatial.tsx）
- ViewSwitcher 的 spatial 态解禁（去 disabled）；collections 的 `view === 'spatial'` 分支渲染
  `<SpatialView rows={rows} allItems={items} onOpenItem onSelect />`。
- 布局：`position:absolute` 卡片（150×64 量级），容器相对定位 + 视口滚动；**非 WebGL、非无限
  画布**（D-079 纪律：Canvas 树是另一回事，这里只是摆位投影）。
- 未摆位项自动网格排（4 列）；拖动用 pointer events + transform，mouseup 落位。

### B. 摆位持久化（scratch 档）
- `prefs.ts`：`loadSpatialLayout(page)` / `saveSpatialLayout(page, map)` 存
  `localStorage.gsc.spatial.v1`：`{ [page]: { [itemId]: { x, y } } }`。
- 拖动即存（节流 300ms）；关页可丢（scratch 语义）；「清空摆位」按钮恢复网格。
- 零副本纪律：摆位**不写对象本体**（探针断言无 POST/PATCH/PUT/DELETE）。

### C. 圈选 + 上下文条
- 空白处 pointerdown 拖出矩形（虚线框）→ 松手计算相交卡片 → 选中集（选中卡高亮光晕）。
- 底部上下文条（复用 Layout 4 版式）：「圈定：N 项 · 改边界（点击取消单项）· 提交给 Agent」。
- 再点空白清除圈选；点卡片本体=打开详情（区分拖动与点击：位移阈值 4px）。

### D. 委派链路（真链路：命名/分类提案）
- 「提交给 Agent」→ `POST /api/agent/propose`（chunks = 圈选项的 title+content_text 摘要，
  ≤20 项）→ `ChunkSuggestion[]`（semantic_name / classification / rationale）。
- 逐 suggestion 落 `POST /api/proposals`：`kind='semantic_name'`（proposed_value=semantic_name）
  与 `kind='classification'`（proposed_value=classification），target_id=对应 item，
  rationale 带上，source='agent'。失败项 toast 带过（不阻塞其余）。
- 注：`classification` 提案接受后仅落定不自动改类（resolveProposalApplying 现状：review-marked
  only）——如实呈现，不假装生效。

### E. 提案卡回落（复用 V3）
- 挂载/委派后 `listProposals('pending')` 过滤 target_id ∈ 空间集 → 紫框卡渲染在目标卡右下
  （offset 12,12），显示 kind 标签 + proposed_value + 三键（采纳/拒绝/暂缓=本地收起）。
- 采纳走 V3 的 `resolveProposal` + `onRefresh` 语义（对象变化后卡片标题同步刷新）。
- 落点=目标卡旁（确定性布局）；**拖放提案卡到指定位置后置**（§5 确认点 3）。

### F. kept 档（Q-E 通过后，可同批或下批）
- 迁移 `0014_spatial_layouts.sql`：`spatial_layouts(item_id, x, y, owner_id, page)` 逐行坐标
  （**不用 JSONB 大包**）；`GET/PUT /api/spatial-layout?page=` 端点（owner 隔离）。
- 空间工具条「钉住摆位」：scratch map → PUT 逐行；「钉住」后拖动直接写 kept（节流）。
- scratch→kept 只升不降；canonical 结构照旧走 Context/Cluster（不另造第三套）。

## 3. 验收门（M4）

| 项 | 口径 |
|---|---|
| 功能 | 摆位/圈选/委派/提案卡三键全通；采纳后标题即改 + via proposal 紫迹（V3 链路回归） |
| 零副本 | 探针：摆动/圈选/切换期间 mutating=0（提案创建是显式提交动作，不计） |
| 治理 | 委派结果全部以 pending 提案落地；未确认不改对象（D-042 回归） |
| 截图 | 圈选+上下文条+提案卡回落全景一张（对齐 fig-v4-spatial） |

## 4. 不做（本期）

墨迹 ink · 自动结构重组 · 无限画布 · 自由问答委派（proposer 能力之外）· 提案卡拖放落点 ·
跨页空间模板。

## 5. 确认点

1. **Q-E 档位（开工前提）**：scratch/kept 两档先行、canonical 走 Context/Cluster——同意？
   （本期至少做 scratch；kept 档同批做（F 段）还是下批做，请选）
2. **委派语义**：现有 proposer 是「逐项命名+分类建议」——V4 就做这条真链路（结果=重命名/
   分类提案落回），「对选中项自由提问」后置——同意？
3. **提案卡落点**：确定性落目标卡右下（不做拖放定位）——同意？
