# INFORMATION_MODEL_V1_PLAN.md — G6 信息模型 v1.0 MVP（对表 + 补缺 + 四轴显式化）

Status: `PROPOSED` — 2026-11-24，待确认后执行。
验收口径（GOALS G6）：**INFORMATION_MODEL v1 全部行为落地并有实证记录**。本文档是执行计划；
`INFORMATION_MODEL.md` 仍是唯一权威模型文档（本计划 C 批对它做合规修订）。

## 0. 对表现场（spec 行为 ↔ 实现，已抽查）

| Spec | 行为 | 实现现状 | 判定 |
|---|---|---|---|
| §2 | raw/object 双形、不强制抽取 | 9 类型 + derived_from/references ✓ | ✅ |
| §3 | 三级是概念区分、**不建层级基础设施** | 无此类表/层 ✓ | ✅（负向行为） |
| §4 | 五域保留（user/coworker/artifact 出 MVP 仅保留值） | `DOMAINS` 五值 ✓（items.ts:22） | ✅ |
| §5 | 共享元数据字段组 | items 表齐全 ✓；type 字段无 JSONB（红线守住） | ✅ |
| §6 | raw: active/archived；object: draft/active/superseded | raw ✓ 精确一致；object 多出 `outdated`（有意扩展，spec 未记） | 🟡 漂移 |
| §6 | 「agent 创建的 object 从 draft 起」 | defaultStatus(object)=draft ✓ | ✅ 待补实证 |
| §6 | 「archiving never deletes content」 | archived 不触内容 ✓ | ✅ 待补实证 |
| §7 | 五种 history action | created/updated/status_changed/relation_added ✓；**`relation_removed` 缺**——删关联无事件 | ❌ 真缺口 |
| §7 | history 只追加、删除=archived/superseded | events append-only ✓；但后来加了**软删除（trash/purge）**——spec 无此生命周期 | 🟡 漂移 |
| §8 | Context=显式成员、不推断 | context_members 显式表 ✓ | ✅ |
| §9 | 「MVP 无权限系统」 | **已有**：PAT scope、owner scoping、cluster shares、authz 模块 | 🟡 漂移（正向） |
| §11 | Semantic Name=每 Chunk 一名 | items.title ✓；D-107 增加**大纲节点级标题**（同一 Chunk 多名） | 🟡 漂移（扩展） |
| §11 | Meta Tag「三层未落地」 | **G5 已落地**（组/标签/指派三层 + typed 参数） | 🟡 漂移（正向） |
| §12 | Cluster=显式成员、可多重归属 | cluster_members ✓ | ✅ |
| §13 | 提案五 kind、append-only、accept 走普通更新路径 | ✓；D-106 扩了 pending_definition 流 | ✅（扩展待记） |

另有 GOALS 挂账：**四轴 info/trajectory/vision/position 显式化随 G6 落**（现归块轴实现为
Cluster 同名归并，四轴无显式结构）。

## 1. 任务卡（AGENTS.md §3）

- **Purpose**：让「信息模型」从文档变成可证的产品契约——每个行为有实证（测试/探针/行号），
  真缺口补上，演进处合入权威文档，四轴从口径变成显式结构。
- **Scope**：① conformance 矩阵（行为→实现→证据）② `relation_removed` 补缺 + 3 个行为实证测试
  ③ 四轴显式化（载体见 §3）④ INFORMATION_MODEL.md 合规修订。
- **Interacts with**：`server/repo/relations.ts`（缺口）、`src/lib/{events,items}.ts`、
  G5 meta_tag 设施（四轴载体）、G2 归块提案、`INFORMATION_MODEL.md`、新 `docs/MODEL_CONFORMANCE.md`。
- **Does not own**：新类型（Principle/Experience/Taxonomy 仍 DEFERRED）、权限系统扩展、
  向量检索、层级基础设施（§3 红线）、抽取管线。
- **User flow**：① 打开 conformance 矩阵——每行行为有 ✅/证据链接；② 删一条关联 → 历史出现
  「关联移除」事件；③ G2 归块/打标时可选四轴标签（info/trajectory/vision/position），
  列表可按轴筛。
- **Minimum implementation**：deleteRelation 补事件 + 矩阵文档 + 四轴 meta group（1 组 4 标签，
  复用 G5 提案/筛选）+ spec 修订。
- **Test method**：`npx vitest run`（relation_removed 事件、archived 不动内容、agent 起 draft、
  四轴组预置与筛选交集）；矩阵每行的「证据」列可点击复核。

## 2. 批次

| 批次 | 内容 | 出口 |
|---|---|---|
| A 对表+补缺 | `docs/MODEL_CONFORMANCE.md` 矩阵（§0 十六行全量展开到行为粒度）；`deleteRelation` 补 `relation_removed` 事件；补 3 个行为实证测试（agent 起 draft / archived 保内容 / 事件只追加） | vitest 全绿；矩阵 16+ 行为全部有证据列 |
| B 四轴显式化 | 载体落地（默认：G5 meta group `axis` 预置 info/trajectory/vision/position 四标签）；G2 归块提案可挂轴（proposed_value/参数）；筛选接轴 | 归块→挂轴→按轴筛实测链通；vitest 全绿 |
| C spec 修订 | INFORMATION_MODEL.md：§6 补 `outdated` + 软删除注记、§7 补扩展事件词表、§9 权限段改「基础权限已落地」、§11 meta tag 改已落地 + 节点级语义名注记、§13 pending_definition 注记、四轴写入 §11；文内修订记录 | 文档评审通过；D-108 记录 |

## 3. 待决策（3 个，`PROPOSED`，附建议）

1. **四轴载体**：建议 G5 meta group `axis`（四标签）——复用提案流/typed 参数/筛选，零新存储；
   备选：clusters 加 kind 列（把轴变成 Cluster 分类，偏离 §12「Cluster=主题关联」语义）。
2. **漂移合入方式**：建议直接修订 INFORMATION_MODEL.md + 文内「修订记录」小节（保持单一权威
   文档，AGENTS.md 纪律）；备选：另开 v1.1 文件（双文档必漂移，不建议）。
3. **`outdated` 定位**：建议 §6 保留词表并注记来源（G4 需求引入）；备选：收回（无必要，已广泛使用）。

## 4. 不做

Principle/Experience/Taxonomy 类型 · 自动抽取管线 · 层级基础设施 · 权限模型扩展 · 向量检索 ·
四轴自动归轴（机器归轴走提案制，人确认才落——§13 红线不变）。
