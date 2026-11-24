# META_TAG_V1_PLAN.md — Meta Tag System v1.0 执行计划

Status: `PROPOSED` — 2026-11-24。
设计蓝本：`META_TAG_SYSTEM_V1.md`（PROPOSED，四确认点按推荐口径执行：四组固定起步 /
多父只做 tag→group 一层 / chunk 级参数落 importance/valid_time/visibility/自定义 /
tag_values 语义重命名「打标记录」）。
目标归属：G5（定义→建议→确认→打标→筛选闭环）+ G6 信息模型的 meta 维度。

## 0. 目标（具体场面）

设置页建 tag「技术栈」并勾选「用户画像」「项目」两组（多父）→ Light Up 对新 chunk 出
meta_tag 提案 → 采纳（填 evidence/temporal）→ 列表按「项目=插件」+importance≥4 筛出条目 →
Profile 视图只显示 confirmed 的画像值。

## 1. Task card（七项）

1. **Purpose** 四轴（用户画像/个人经历/日志/项目）元标注闭环可用——G5 验收。
2. **Scope** 0014 迁移 4 表 · 四组 seed · 多父边 · 打标带参 · group/tag/param 筛选 ·
   meta_tag 提案接通 · 设置页与筛选 UI 最小面。
3. **Interacts** `persistence/migrations/0014_meta_tags.sql` + `schema.ts` ·
   `server/repo/tags.ts`（新）· `server/repo/proposals.ts`（meta_tag accept 带参落库）·
   `server/agent/proposer.ts`（meta_tag 建议从 tag_definitions 选）· `server/router.ts`
   （groups/tags/打标/筛选路由）· `src/views/pages.tsx` + `views.tsx`（筛选条+tag 定义面）·
   `src/services/api.ts`。
4. **Does not own** tag→tag 层级 · confidence 生效 · 云同步 · 组管理 UI · 本体引擎。
5. **User flow** 设置→tag 定义（多选组）→ Light Up 提案卡「打标：项目/技术栈」→ 采纳 →
   列表筛选条按组/标签/参数过滤 → Profile 出 confirmed 画像值。
6. **Minimum** 四组预置 + 多父 + 打标带参 + 筛选 + 提案链通 + 最小 UI。
7. **Test method** vitest（多父/幂等打标/参数/筛选/accept 落库）+ 手动腿 + 截图。

## 2. 执行路径（六层）

### A. 数据层（0014_meta_tags.sql）
`meta_groups`（id,key,name,description,visibility_default,created_at）·
`meta_tag_groups`（tag_id,group_id 复合 PK）· `assignment_params`（id,assignment_id,key,
value,value_type）· `item_meta_params`（id,item_id,key,value,value_type）。
`tag_values` **不动**（文档口径=打标记录）；唯一约束 `(definition_id,item_id,value)` 幂等。
四组 seed：迁移内 INSERT ON CONFLICT DO NOTHING（用户画像/个人经历/日志/项目）。

### B. 仓储（server/repo/tags.ts 新）
listMetaGroups（seed 后只读）· createTag(name,description,groupIds[])→tag_definitions+
meta_tag_groups · assignTag(itemId,definitionId,value,params[])→tag_values+assignment_params
（幂等）· setItemParam(itemId,key,value,type) · **筛选** filterItems({groupId,tagId,param})→
join 过滤（group→边→tag→打标→item；param→item_meta_params）。

### C. API（router.ts 路由表，RouteSpec+idem）
`GET /api/meta/groups` · `POST /api/tags` / `GET /api/tags` ·
`POST /api/items/:id/tags`（打标+params）· `PUT /api/items/:id/meta-params` ·
`GET /api/items?group=&tag=&param.k=v`（筛选参数并入既有 items 查询）。

### D. 提案接通（G5 建议→确认）
meta_tag 提案 payload 补 definition_id/value（建议从现有 tag_definitions 里选，不发明新 tag
——发明新 tag 的建议单独标 pending_definition）；accept 分支落 tag_values（+可带 params）。
suggestForChunks 的 meta 建议面增强（LLM 从 tag 清单选）best-effort。

### E. 前端最小面
设置页 tag 定义卡（名称/描述/多选组）+ 列表筛选条（组 chips→tag chips→param 输入）+
meta_tag 提案卡显示「组/标签/值」。Profile 确认面核对只出 confirmed（D-066 不变）。

### F. 验收门
| 项 | 口径 |
|---|---|
| 多父 | 一 tag 挂两组（用户画像+项目），两组筛选都能命中 |
| 幂等 | 同 (tag,item,value) 重打标零重复 |
| 参数 | assignment 与 item 两层参数落库可筛 |
| 筛选 | group/tag/param 组合过滤正确 |
| 提案 | meta_tag 提案→采纳→打标落库→筛选对账（含 evidence 参数） |
| 回归 | tsc=0 lint=0 vitest 全绿（+新） |

## 3. 不做（本期）

tag→tag 层级 · confidence 生效 · 组管理 UI/删组 · 云同步 · 自动归组（一律提案）·
Profile 新视觉。

## 4. 确认点（残余）

1. meta_tag 建议**只从现有 tag_definitions 选**（发明新 tag 走 pending_definition 待确认）——ok？
2. 筛选并入既有 `/api/items` 查询参数（不另开查询端点）——ok？
