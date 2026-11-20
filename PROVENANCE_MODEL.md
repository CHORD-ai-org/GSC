# PROVENANCE_MODEL.md — 溯源与信息血缘

> 2026-11-20 · 回答 spec §3 全部设计问句；每问标注实现状态。

## 1. 五类信息状态（必须可区分）

| 状态 | 存储表达 | UI 表达 |
|---|---|---|
| 原始来源信息 | `item_content.content_text` 逐字 + `source_label`/`origin='user'|'import'` | SemTag「原文」灰 |
| 机器解释 | `proposals` 行（kind/proposed_value/rationale/source）；Light Up 会话内 `nameOrigin='rule'|'agent'` | SemTag「机器」紫 |
| 用户修改 | 更新走 `PATCH /items/:id` → `events` 记 `updated` 事件（actor=user） | SemTag「已确认」绿 |
| 用户确认 | 提案 `resolveProposalApplying`（accepted）→ 数据落库 + 事件；tag_value `confirmed=1` | ✓ 已确认 |
| 派生↔来源 | `relations.kind='derived_from'`（object→raw 为主） | 详情页配对芯片 ⇄ |

## 2. 设计问句逐条

**Q1 Chunk 能否引用多个来源？** ✅ 能。`source_label` 是快捷标记；真正的多来源用多条 `derived_from` 关系表达（edge 唯一索引防重）。状态：DECIDED。

**Q2 一个来源能否产出多个 Chunk？** ✅ 能。Light Up 切块即一源多块；所有块共享 `source_label`。DECIDED。

**Q3 Chunk 能否由多个信息对象派生？** ✅ 能（多条入向 `derived_from`）。DECIDED。

**Q4 语义名/描述如何归属？** 创建即带（rule 建议或用户输入）；之后任何 `PATCH title` 写 `events`（actor/datetime/detail）。机器提议走 proposals（`kind='semantic_name'`），接受才生效。DECIDED。

**Q5 用户编辑与 Agent 提议如何区分？** 提议在 `proposals`（source=agent/detector）→ 未接受前**不碰用户数据**；用户编辑直接走 PATCH + 事件。Light Up 会话内用 `nameOrigin` 标记（会话态，不入库——入库后统一为「用户确认」）。DECIDED。

**Q6 如何保存历史而不复制整记录？** `events` append-only（at/actor/action/detail），只记变更事实不快照全量。取舍：可审计但不可时间旅行（无事件溯源——spec §6 明令避免）。DECIDED。

**Q7 语义关系 ≠ 血缘，如何分开？** `relations.kind` 词表分离：`derived_from`（血缘）与 `related_to/supports/challenges`（语义）语义不同；成员关系在 `cluster_members`/`context_members`（归属），完全独立。DECIDED。

## 3. 不变式

1. 原文永不由解释覆盖（raw 的 content_text 只随用户显式 PATCH 变化）。
2. 机器产生的任何值在确认前只存在于 proposals / 会话态。
3. 每次持久化变更都有事件行（created/updated/deleted…）。
4. 溯源可经 API 检查：`GET /items/:id` 返回 relations+events 全量。
