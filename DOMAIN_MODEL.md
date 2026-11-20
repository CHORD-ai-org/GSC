# DOMAIN_MODEL.md — 核心领域模型（正式化）

> 2026-11-20 · 状态标记：DECIDED / PROPOSED / OPEN / DEFERRED。每节注明对应实现实体。

## 1. Raw Information ↔ Chunk 的关系

**DECIDED（D-042，实证）**：仓库用**统一 `items` 表 + 两类前缀**承载二者：

- `raw.*`（document/message/evidence/filecontent）= Raw Information：原文逐字（`item_content.content_text`），来源（origin/source_label/author/locator），独立可寻址。
- `object.*`（concept/decision/methodology/hypothesis）= 结构化对象（§3）。

**Chunk 是统称**（Vision 对齐记录，INFORMATION_MODEL §11）：每个 item 就是一个可独立识别的信息单元。关键不变式：

1. **Chunk 身份不与切块算法/嵌入模型/LLM 耦合**（spec §2.2）——`id` 在创建时生成，切块规则变化不影响已有身份。✅ 实证：`lightup.ts` 切块只是建议，身份由入库时刻确定。
2. 原文与解释分离：raw 存原文，object 语义名/定义可更新（history 记录），互不覆盖。
3. 短信息可以整条成为一个 Chunk（快路径），长信息可衍生多个 Chunk（`derived_from` 关系）。

OPEN：spec §2.2 的「description/summary」属性——现由 `fields` 按类型承载（如 definition），未做统一 summary 字段。DEFERRED 到有真实需求。

## 2. Structured Objects

**DECIDED**：保留**统一对象模型 + 类型化 fields**（单表 `items` + `item_content` 按类型存字段）。不做每类型一表、不做继承层级（spec §2.3 明确允许并偏好）。类型词表在契约层校验（`OBJECT_TYPES`），字段按 `fieldsFor(type)` 白名单。

## 3. Cluster

**DECIDED（D-045/D-042）**：Cluster = 用户管理的关联分组（`clusters` + `cluster_members`）。

- CRUD、成员增删、多归属（复合 PK 防重复成员）、`added_at` 记成员时间、`owner_id` 归属、`cluster_shares` 预留共享（PLAN-7）。
- **成员类型实证决定**：`cluster_members.item_id` FK → `items.id`，即 **Raw 与 Object 都可入组**（spec §2.4「investigate…do not assume」）——理由：关联分组以信息单元为粒度，raw/object 同为 Chunk；限制成员类型会在 UI 与 API 引入无谓分支。

## 4. Context

**DECIDED（D-027…D-029）**：Context = 目的导向视图（subject/scope/purpose/title），与 Cluster 严格分工（视图 vs 关联）。显式成员、持久、不拥有/不复制成员内容（只存 membership 行）。无自动语义成员（MVP 边界）。

## 5. Meta Tag

**DECIDED（D-064…D-066，spec §2.5 的核心区分已落实）**：

- **定义 ≠ 赋值**：`tag_definitions`（维度：Thinking Style/Expertise/…）与 `tag_values`（赋值：`AI Architecture` ← 挂 item 或 Profile）分表。
- 赋值承载：`value`（自由串）、`scope`（global/project:/context: 前缀）、`owner_id`、`confirmed`（用户确认=权威化的唯一通道）。
- **Assignment Source**：暂以 `confirmed` 二值 + 提案表（`proposals.kind='meta_tag'`，source=agent/detector）表达「机器建议 vs 用户确认」；**confidence 字段 DEFERRED**（spec 允许 "if justified"——无真实消费方不加）。
- 可见性：赋值带 owner，Profile 输出仅出已确认值（D-066）。

## 6. 实体责任一览

| 实体 | 身份 | 一句话责任 | 不负责 |
|---|---|---|---|
| item (raw.*) | id | 保存原文与来源 | 不做解释 |
| item (object.*) | id | 持有语义身份（名/定义/属性） | 不持有原文 |
| relation | (kind,from,to) | 语义边（含 derived_from 溯源边） | 不做成员 |
| event | id | append-only 变更史 | 不做回滚 |
| cluster(+members) | id | 关联分组 | 不做目的 |
| context(+members) | id | 目的视图 | 不做拥有 |
| proposal | id | 机器建议待人工裁决 | 不写用户数据 |
| tag_definition / tag_value | id | 语义维度 / 维度赋值 | 不做本体引擎 |
| user / cluster_share | id | 归属与共享边界 | 不做 RBAC |
