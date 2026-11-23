# PHASE_07_V2_PLAN.md — 多投影切换（M2）执行计划

Status: `PROPOSED` — 待确认开工。2026-11-23。
依据：`PHASE_07_PLAN.md` / `PHASE_07_执行计划.docx` §四 · 创始人决策（多视角）· Layout 演示
`docs/research/malleable-context-space/figs/fig-v2-views.png`。V1（M1）已完成：D-089，vitest 136/136。

## 0. 目标（具体场面）

「原始信息 / 对象」列表顶部的切换器从两态（列表/网格）扩为多态：**列表 · 网格 · 关系 · 时间线 ·
空间（占位）**。同一份筛选结果切「关系」→ 显式边连线图；切「时间线」→ 事件按日分组、
蓝（你）/橙（Agent）色点；「保存当前筛选」把 筛选+视图 存为命名视图，下次一键恢复。
**任何切换零写请求、零副本**——投影只读，视图不是数据模型（D-079 纪律）。

## 1. Task card（AGENTS.md §3 七项）

1. **Purpose** 落实"多视角"决策：同一份数据换角度看，不复制不换库。
2. **Scope** ViewSwitcher 扩展（raw/objects 两页）· TimelineView · RelationsView ·
   批量关系端点 · GET /api/events · saved views（localStorage）· 零副本探针。
3. **Interacts** `src/lib/prefs.ts`（ViewMode）、`src/lib/viewMode.tsx`、`src/views/collections.tsx`、
   新 `src/views/timeline.tsx`/`relations.tsx`、`server/router.ts`、`server/repo/events.ts`、
   `server/repo/relations.ts`、`src/services/api.ts`。
4. **Does not own** 不为投影建存储表；关系图≠图数据库（SVG 固定布局）；空间视图（V4 范围，
   本期仅占位）；对象数据本体（零写）；clusters/contexts 页（本期不接，沿用双态）。
5. **User flow** 工具栏点「关系」→ 当前筛选的 N 个对象画成连线图（实线=已确认边，虚线=待确认
   association 提案），点节点开详情 → 点「时间线」→ 事件流（日期分组、actor 色点、点行开对象）
   → 点「保存当前筛选」输入名字 → 切换器旁「视图库」下拉出现该视图，点击即恢复筛选+视图。
6. **Minimum** 四个视图模式 + 时间线 + 关系图（静态布局）+ saved views（localStorage）。
7. **Test method** vitest：GET /api/events 与批量 relations 的过滤/越权测试；零副本探针
   （CDP spy fetch，切遍五视图断言无 POST/PATCH/PUT/DELETE）；关系/时间线截图。

## 2. 技术路径（分层）

### A. ViewMode 扩展（前端骨架）
- `prefs.ts`：`ViewMode = 'list'|'grid'|'relations'|'timeline'|'spatial'`（存量 'list'/'grid'
  兼容不动）。
- `viewMode.tsx`：ViewToggle → **ViewSwitcher**，五态（空间态 disabled 占位）；沿用
  ui.module.css viewToggle 样式，新图标（关系=两节点一线，时间线=轴+点）。
- `collections.tsx`（Raw + Object）：`view === 'relations'` → `<RelationsView rows …/>`；
  `'timeline'` → `<TimelineView rows …/>`。**投影作用于当前筛选 rows**（同一份数据）。

### B. 数据端点（只读）
| 端点 | 语义 | 实现 |
|---|---|---|
| `GET /api/events?item_ids=&since=&limit=` | 列表级事件流 | `repo/events.ts` 新 `listEventsForItems(db, ids, {since, limit})`，一次 inArray；响应用 `visibleItemIds` 过滤（越权 0 泄漏） |
| `GET /api/relations?item_ids=` | 批量关系 | `repo/relations.ts` 新 `listRelationsForItems(db, ids)`：`inArray(from_id) OR inArray(to_id)` 一次查询；仅返回两端均可见的边 |
| `GET /api/proposals?kind=association` | 待确认边（已有） | 过滤 pending + target_id 在集内 → 虚线渲染 |

### C. TimelineView（新 `src/views/timeline.tsx`）
- 按 `at` 倒序，日期分组（今天/昨天/M-D）；行 = actor 色点（蓝=你/橙=Agent，与 V1 同语言）
  + action 标签（created/updated/opened/proposed…）+ 对象标题（点击开详情）+ 相对时间。
- 数据：挂载/rows 变化时 `GET /api/events?item_ids=<当前 rows ids>&limit=500`（ids 上限 200，
  超出取前 200 并提示）；组件内 state 缓存，切视图不重取（同参数）。
- 空态：「暂无事件」。

### D. RelationsView（新 `src/views/relations.tsx`）
- **SVG 固定分层布局**（非力导向、非图库）：rows 横向排主行；有边的关联对象排第二行；
  边用折线连接，标签=关系 kind。rows>40 时只画有边的节点（防糊）。
- 实线=已确认 relation；虚线灰= pending association 提案（提案→确认制不变）。
- 节点点击 → onSelect(item.id)；hover 高亮相邻边。
- 投影纪律：**画边不写边**——如需建立关系走既有提案流（本期不做新建边交互，仅浏览+跳转）。

### E. Saved views（prefs 层）
- `prefs.ts`：`SavedView = {id, name, page, view, filters:{type,domain,q,dim}}`；
  `loadSavedViews()/saveSavedViews()` 存 `localStorage.gsc.savedViews.v1`。
- 工具栏：「保存当前筛选」（prompt 命名）+「视图库」下拉（应用/删除）。
- 应用 = 一次性回填筛选 state + view mode（不发任何写请求）。

### F. 零副本探针（验收工具）
- `scripts/probe-views.mjs`：CDP 注入 fetch spy，依次切 list/grid/relations/timeline 各 2 轮，
  统计 mutating 请求数，**断言 = 0**；同时 dump 关系图节点数/时间线条数。
- 复用 probe-bars.mjs 的连接骨架。

## 3. 验收（M2 门）

| 项 | 口径 |
|---|---|
| 功能 | 四视图可用（空间占位）；保存/应用/删除视图；节点/事件行可跳详情 |
| 零副本 | 探针 mutating=0；vitest 全绿（136+新） |
| 越权 | events/relations 端点过滤不可见项（authz 测试覆盖） |
| 截图 | relations + timeline 各一张（对齐 fig-v2-views.png 版式语言） |

## 4. 不做（本期）

空间视图实现（V4）· clusters/contexts 页接入 · 关系新建/删除交互 · 向量/图引擎 ·
时间线跨页聚合（>500 事件截断即可）。

## 5. 确认点

1. 视图顺序：列表/网格/关系/时间线/空间——同意？
2. 时间线范围：只反映当前筛选集（非全库）——同意？
3. saved views 仅 localStorage（不落库）——同意？
