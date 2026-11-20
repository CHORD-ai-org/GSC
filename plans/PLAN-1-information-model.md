# PLAN-1 — 信息模型对齐与演进（Chunk / Cluster / Meta Tag）

Status: `PROPOSED` · 源：`PRODUCT_VISION.md` §2.1、§5 · 依赖：无（其余轨道的地基）

## 目标场景

用户把一段论文摘要 Light Up 进来，系统给出语义名「Chunking 优于长上下文的证据」，原文逐字保留；Detector 提示它与既有 Chunk「Context Window」同属一个主题，用户确认后二者进入 Cluster「Agent Architecture Research」；整个过程里原文、机器解释、用户确认三层各归其位。

## 现状 → 缺口

| 要求（Vision） | 现状（代码事实） | 缺口 |
|---|---|---|
| Chunk = 原始内容 + 语义身份一体 | `items` 里 raw.* 与 object.* 是两类 | 模型裁决：合并成 Chunk 或保留双类+映射 |
| Semantic Name 一等公民 | `title` 自由填写 | 无「语义命名」概念；无机器提议态 |
| 原文不可被解释替代 | raw 内容不可编辑（D-014）✓ | 原则已满足，写进模型文档 |
| Cluster（多对多关联分组） | 无 | 新结构：`clusters` + `cluster_members`（chunk 可属多 cluster） |
| Meta Tag 三层（定义/取值/作用域） | `domain` 单选 | 新结构（细节归 PLAN-8） |
| 三层输出区分（原文/机器/用户） | `origin: user/import/agent` + events | 缺「提案（proposal）」状态层 |

## 阶段

- **A1-1 词汇裁决**：Chunk↔items 的映射写成 `INFORMATION_MODEL.md` v2（改名 or 映射表），DECISION_LOG 记录，全仓文档统一。
- **A1-2 Schema 演进**：`clusters`/`cluster_members` 迁移（迁移文件制，禁 JSONB）；item 增 `semantic_name` 派生态或改名 `title`。
- **B1-1 提案层**：`proposals` 表（机器提议的命名/标签/关联，pending/accepted/rejected），Agent/Detector 输出落这里（喂 PLAN-4）。
- **B1-2 Cluster CRUD**：创建/加成员/多归属；Overview 与侧栏出现 Clusters 区。
- **C1-1 全量回填**：既有数据按新模型迁移，Phase 06 场景 A–D 在新模型上重跑。

## 边界

不做向量检索、不做自动聚类入库（Detector 只出候选）、不改 provenance/events 语义。

## 验证

迁移可重复执行；`npm test` 增模型契约用例；一个 chunk 同属两个 cluster 的往返测试；三层内容在 API 响应中字段可区分。

## 待决策

1. Chunk 合并 raw/object 为单表，还是保留双类、Chunk 作为统称？（影响面最大，先答）
2. Semantic Name 是新字段还是 `title` 改名？
3. Proposal 是独立表还是 events 里的 action 类型？
