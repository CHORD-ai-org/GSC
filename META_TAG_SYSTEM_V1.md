# META_TAG_SYSTEM_V1.md — Meta Tag System v1.0 设计

Status: `PROPOSED` — 2026-11-24。
依据：创始人课堂笔记（2026-11-24）——chunk 可归纳多个 meta-tag；Meta Tag 设计牵扯 Cloud
Architecture；结构=Meta Group（大类）+ Meta Tag（可多父级集合）；V1.0 四大类：用户画像 /
个人经历 / 日志 / 项目；需设计 chunk 的 meta parameter set。
现有设计基线：`DOMAIN_MODEL.md §5`（D-064…D-066）+ `tag_definitions`/`tag_values` 表 +
`proposals.kind='meta_tag'` 通道（G5：定义→建议→确认→打标→筛选）。
⚠️ 文档漂移：记忆中的 `MEMORY_TAG_MODEL.md` 不存在，实际设计在 DOMAIN_MODEL.md §5（已记）。

## 0. Eval：现有设计 × 创始人笔记

| 点 | 现有（§5 + schema） | 笔记要求 | 裁决 |
|---|---|---|---|
| 定义≠赋值分表 | `tag_definitions` / `tag_values` | 同向 | **保留**（D-064 不动） |
| chunk 多标签 | `tag_values.item_id` 已是 N:N | 同一个 chunk 多个 meta-tag | **已满足** |
| meta group 大类 | 无（只有扁平 definition） | Group 层 | **新增** `meta_groups` |
| 多父级集合 | 无层级 | 一个 tag 可挂多个父级集合 | **新增** N:N 边（DAG 第一层） |
| 参数集 | `value` 自由串 + scope/confirmed | chunk 的 meta parameter set | **新增** 参数表（typed） |
| 权威化 | `confirmed` 唯一通道（提案制） | （隐含不变） | **保留** |
| confidence | DEFERRED（D-065，无消费方不加） | （未提） | **维持 DEFERRED**，参数集留槽位 |
| Cloud 牵扯 | scope 前缀（global/project:/context:） | 设计牵扯云架构 | **预留接口不实现**（见 §6） |

一句话：现有地基（分表/提案/confirmed）全可复用；缺的是**三层结构**
（Group → Tag 多父 → 带参数的打标）和 **parameter set**。

## 1. 概念模型（三层 + 参数）

```
MetaGroup（大类，V1 四个）
   └─< MetaTagGroup（N:N 多父边）>─ MetaTag（语义维度名）
                                      └─< TagAssignment（chunk × tag）
                                            └─< AssignmentParam（typed 参数）
Chunk(Item) ── ItemMetaParam（chunk 级 parameter set，与打标正交）
```

- **MetaGroup**：大类=归约轴。V1 定四个（创始人定稿）：**用户画像 / 个人经历 / 日志 / 项目**。
  固定枚举起步（可后加，不删）。
- **MetaTag**：语义维度（如「技术栈」「情绪」「里程碑」）。**可挂多个 group**（多父级集合），
  例：`AI Architecture` 同属「用户画像」（能力维度）与「项目」（GSC 项目技术栈）。
- **TagAssignment**：chunk×tag 打标记录，带参数（见 §3）。一个 chunk 多 tag、一个 tag 多 chunk。
- **ItemMetaParam**：chunk 自身的元参数集（与打标正交的全局参数），见 §3。

## 2. V1.0 Meta Group 列表（种子）

| Group | 语义 | 种子 MetaTag 举例（非穷举） | 预期消费 |
|---|---|---|---|
| 用户画像 | 人的稳定特征 | 思维风格 / 专长领域 / 沟通偏好 / 工具链 | Profile 输出（D-066 只出 confirmed） |
| 个人经历 | 人的经历轨迹 | 教育 / 履历 / 里程碑 / 转折点 | 轨迹视图（G6 trajectory 轴） |
| 日志 | 行为与过程记录 | 每日记录 / 实验记录 / 教训 / 状态变更 | 时间线/回顾 |
| 项目 | 项目与作品 | 项目名 / 技术栈 / 角色 / 阶段 / 交付物 | 项目区块（Cluster 对齐） |

种子 tag 走「定义→确认」通道建入 `tag_definitions`（含 group 边），不绕提案制。

## 3. Chunk 的 Meta Parameter Set（两层）

**A. 打标参数**（挂在 TagAssignment 上）——该 tag 赋值在此 chunk 上的参数化：
| 参数 | 类型 | 例 | V1 |
|---|---|---|---|
| `confidence` | number | 0.8 | **槽位预留**（消费方出现才启用，D-065） |
| `temporal` | date_range | 2026-01~2026-03（该标签对该 chunk 的适用期） | ✅ |
| `evidence` | text | 依据摘录/来源 locator | ✅ |
| `source` | enum | user / agent / detector（与 confirmed 正交） | ✅ |

**B. chunk 级参数**（ItemMetaParam，与打标正交的全局参数）：
| 参数 | 类型 | 例 |
|---|---|---|
| `captured_at` | datetime | 入库时刻（已有 items 字段，参数表不重复存——视作参数集的内建项） |
| `valid_time` | date_range | 内容适用期 |
| `importance` | enum 1-5 | 重要度 |
| `visibility` | enum | private / shared（**云架构接口**，见 §6） |
| 自定义 | (key, value, value_type) | 用户/agent 自由扩展（value_type 复用 text/number/enum/bool/date） |

实现约束：参数落**列/边表**（`assignment_params` / `item_meta_params`：key/value/value_type），
不做 giant JSONB（AGENTS §7）。

## 4. 数据模型（增量迁移，零推翻）

| 表 | 动作 | 关键列 |
|---|---|---|
| `meta_groups` | 新 | id, key(用户画像/个人经历/日志/项目), name, description |
| `meta_tag_groups` | 新（多父边） | tag_id, group_id（PK 复合） |
| `tag_definitions` | 微调 | +description 已有；不加 group_id（多父走边表） |
| `tag_values` | 微调 | = TagAssignment（item_id, definition_id, value, scope, confirmed, owner_id 已有）+ 语义重命名为打标记录 |
| `assignment_params` | 新 | assignment_id, key, value, value_type |
| `item_meta_params` | 新 | item_id, key, value, value_type |

约束：`(definition_id, item_id, value)` 唯一（幂等打标）；group 删除→边级联、tag 保留。

## 5. 行为闭环（G5 对齐：定义→建议→确认→打标→筛选）

1. **定义**：建 group（V1 预置四个）/ 建 tag（挂 1..n 个 group）。
2. **建议**：`proposals.kind='meta_tag'`（agent/detector 建议 chunk×tag×value）——不变（D-042）。
3. **确认**：`confirmed=1` 权威化唯一通道——不变（D-066）。
4. **打标**：accept 落 `tag_values`（+可带 assignment_params）；手动打标同通道（actor=user）。
5. **筛选**：按 group/tag/param 过滤 items（API 查询参数），Profile 只出 confirmed（D-066）。

## 6. 与 Cloud Architecture 的关系（接口预留，V1 不实现）

- **Group=分区/同步域候选**：「用户画像/个人经历」=个人私域（端到端加密候选），「项目」=
  可共享域（cluster_share 语义延伸）——group 表留 `visibility_default` 列即可，同步协议 V2。
- **ID 稳定性**：group/tag/assignment 用 ULID 文本 id（现有惯例），跨设备/云端可合并。
- **参数溯源**：`source` 参数 + owner_id 已覆盖最小溯源；多端合并冲突（last-write vs 确认优先）
  V2 设计——**打标权威化已天然锚定 confirmed=1**，云合并以此为不变式。
- 不做：同步协议/多端冲突实现/加密实现（仅列约束防走歪）。

## 7. Task card（七项）

1. **Purpose** 给 chunk 一个结构化的元标注体系（大类×多父 tag×参数），让画像/经历/日志/项目
   四轴信息可定义、可建议、可确认、可筛选——G5 的结构底座 + G6 信息模型的 meta 维度。
2. **Scope** meta_groups 预置四组 · tag 多父边 · assignment/item 参数表 · 筛选查询 ·
   meta_tag 提案接通参数。
3. **Interacts** `schema.ts`（4 表动作）· `repo/tags.ts`（新/扩展）· `agent/proposer.ts`
   （meta_tag 建议带 value）· `router.ts`（groups CRUD / 筛选查询）· `DOMAIN_MODEL.md §5`
   （升版指向本文档）。
4. **Does not own** tag→tag 层级（DEFERRED）· confidence 消费 · 云同步实现 · 本体引擎
   （§5 责任表不变）。
5. **User flow** 设置页建 tag（选 1..n 个 group）→ Light Up 出 meta_tag 提案 → 采纳（可填
   temporal/evidence）→ 列表按「项目=插件」筛选 → Profile 视图出已确认画像值。
6. **Minimum** 四 group 预置 + tag 多父 + 打标带参数 + group/tag 筛选 + 提案链路通。
7. **Test method** vitest（多父边/幂等打标/参数落库/筛选正确）+ 手动腿（提案→采纳→筛选对账）。

## 8. 不做（V1）

tag→tag 层级 · confidence 生效 · 云同步/加密 · 自动归组（建议一律走提案）· 组的增删改
（V1 四组预置固定，管理界面后置）。

## 9. 确认点

1. Group 四个固定起步、组管理后置——同意？
2. 多父只做 tag→group 一层（tag→tag 层级 DEFERRED）——同意？
3. chunk 级参数集 V1 先落 `importance / valid_time / visibility / 自定义`——同意？
4. `tag_values` 语义重命名为「打标记录」（表不动列不动，文档口径统一）——同意？
