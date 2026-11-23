# PHASE_07_V3_PLAN.md — 归因与提案面（M3）执行计划

Status: `PROPOSED` — 待确认开工。2026-11-23。
依据：`PHASE_07_PLAN.md` §五 · CLEO 教训（可见性≠协作）· Layout 演示
`docs/research/malleable-context-space/figs/fig-v3-attribution.png`。
V1（M1）已备底座：events 的 `updated` 已带 changed_keys（含 `fields.<key>`）；V2（M2）已完成。

## 0. 目标（具体场面）

详情页标题下是归因条：「你 2 处编辑 · Agent 3 处编辑 · 2 条提案待确认」（绿/紫 chip）。每个
字段行尾有小圆点标最后编辑者（绿=你/紫=Agent）。页面下方是紫色**内嵌提案行**——「重命名：
注意力 → 自注意力」直接点「采纳」即生效、点「拒绝」即落定、「暂缓」收起稍后再看。
机器产物经确认仍是机器产物：接受提案产生的对象变更记 actor=agent 并标注来源提案。

## 1. Task card（七项）

1. **Purpose** CLEO 教训落地：谁改了什么可见、机器产物就地走确认（D-042 的界面化）。
2. **Scope** 事件归因强化（updateItem/createRelation 贯 actor）· `computeAttribution` 聚合 ·
   详情归因条 · 字段编辑者圆点 · 内嵌提案行（采纳/拒绝/暂缓）· 提案接受归因（actor=agent）。
3. **Interacts** `server/repo/items.ts`（updateItem actor 参数）、`server/repo/proposals.ts`
   （resolveProposalApplying 穿 actor）、`server/repo/relations.ts`（created_by 已支持）、
   `src/lib/events.ts`（computeAttribution 纯函数，server/脚本共用）、`server/router.ts`（detail
   响应附 attribution）、`src/views/detail.tsx`、`src/services/api.ts`。
4. **Does not own** 正文逐字下划线（diff 渲染，后置）· 意图自动推断（CLEO 推断模块，后置）·
   冲突合并 UI（后置）· 提案 schema 的 deferred 状态（词表只有 accepted|rejected；暂缓=本地收起）。
5. **User flow** 开详情 → 归因条「你 2 处 · Agent 3 处 · 2 条提案」→ 每字段行尾圆点 →
   提案行点「采纳」→ 该行变已采纳、对象即刻更新、事件流出现 actor=agent 的 updated（via proposal）。
6. **Minimum** actor 穿线 + 归因聚合 + 归因条 + 字段圆点 + 提案三键行。
7. **Test method** vitest：接受 semantic_name 提案后事件 actor=agent 且 detail 带 via proposal；
   association 提案接受后 relation created_by=agent；computeAttribution 单测；截图对齐 fig-v3。

## 2. 技术路径（分层）

### A. 事件归因强化（actor 穿线）
- `updateItem(db, id, body, opts?: { actor?: 'user'|'agent'; via?: string })`：事件 actor 用
  opts.actor（默认 'user'），detail 附加 `via proposal <id>`（有 via 时）。调用方零改动（可选参）。
- `resolveProposalApplying`：semantic_name → `updateItem(..., { actor: 'agent', via: proposal.id })`；
  association → `createRelation(..., created_by: 'agent')`（relations.ts 的 created_by 已流进事件）；
  cluster → createCluster/addClusterMember 后补一条 appendEvent(actor='agent', action='updated',
  detail='via proposal <id>') 于 target（cluster 创建本身不落 item 事件，标注在 target 上）。
- 不改 createItem（新建议案未覆盖 create 类，暂无调用点）。

### B. 归因聚合（纯函数，共享）
- `src/lib/events.ts` 新 `computeAttribution(events: EventDTO[])`：
  `{ user_edits, agent_edits, field_owners: Record<string, 'user'|'agent'> }`
  ——只统计 action ∈ {updated, status_changed}；从 detail 解析 changed_keys；每 key 取最近一次
  的 actor 为 field_owners。纯函数 → server detail 响应与 V5 脚本共用。
- `GET /api/items/:id` 响应附 `attribution`（router 内 computeAttribution(events)）。
  `ItemDetailResponse` 类型补字段（可选，兼容旧响应）。

### C. 详情归因条 + 字段圆点（detail.tsx）
- 归因条（footprint 之下）：绿 chip「你 N 处编辑」+ 紫 chip「Agent N 处编辑」+ 琥珀 chip
  「N 条提案待确认」（proposals 计数）。零编辑时整条隐藏。
- 字段圆点：`Block` 的每个字段行尾渲染 `<span>` 圆点（绿/紫，title=最后编辑者与时间），
  数据来自 attribution.field_owners[key]；无归属不显示。
- 样式复用 V1 footprint 色语言（#0F6E56 绿 / #534AB7 紫）。

### D. 内嵌提案行（detail.tsx）
- 挂载时 `listProposals('pending')` 过滤 `target_id === item.id`（+ related 视角：related_id ===
  item.id 的也列出，标注「关联此条」）。
- 行 = kind 标签（semantic_name→重命名 / association→新关系 / cluster→新建关联组）+ 提案值 +
  rationale + 三键：**采纳**（resolveProposal(id,'accepted') → 重载详情+toast）· **拒绝**
  （'rejected'）· **暂缓**（本地 state 隐藏该行，不改提案状态——词表无 deferred，如实标注）。
- 复用 Layout 4 的行版式（.pv 样式思路进 views.module.css：propRow/propChip）。

### E. 验收与截图
- vitest（extend proposals/engagement 测试或新 `server/attribution.test.ts`）：
  ① accept semantic_name → 目标 item 事件 actor=agent、detail 含 'via proposal'；
  ② accept association → relation created_by=agent；
  ③ detail 响应 attribution 正确（user/agent 计数 + field_owners）；
  ④ computeAttribution 纯函数单测。
- 截图：带归因条 + 两条提案行的详情页（对齐 fig-v3-attribution.png 版式语言）。

## 3. 验收门（M3）

| 项 | 口径 |
|---|---|
| 功能 | 归因条/圆点/提案三键全可用；采纳即生效、拒绝即落定、暂缓仅收起 |
| 治理 | 提案未确认不改对象（D-042 回归）；接受后变更 actor=agent（机器产物语义） |
| 测试 | tsc=0 lint=0 vitest 138+新 全绿 |
| 截图 | 归因条+提案行详情页一张 |

## 4. 不做（本期）

正文逐字下划线（diff 渲染）· 意图推断（feedback/独立工作分类）· 冲突合并 UI ·
提案 deferred 状态入 schema · 提案新建交互（只处置既有提案）。

## 5. 确认点

1. **提案接受的归因语义**：接受提案产生的对象变更记 **actor=agent**（+via proposal 标注），
   用户的确认动作体现在提案状态流转上——同意？（备选：记 actor=user 表示人已背书）
2. 「暂缓」= 本地收起、提案保持 pending（不加 deferred 状态）——同意？
3. related_id 视角的关联提案（「关联此条」）也列在详情里——同意？
