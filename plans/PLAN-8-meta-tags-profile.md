# PLAN-8 — Meta Tag 体系与 User Profile

Status: `PROPOSED` · 源：`PRODUCT_VISION.md` §5.4 · 依赖：PLAN-1（标签进模型）、PLAN-6（跨应用输出）

## 目标场景

用户把「Thinking Style: 先构造反例再验证」标在自己的决策 Chunk 上；之后在 Codex 里干活时，Codex 通过 GSC 读到这条 User Profile，主动按这个风格组织推理过程——用户不必在每个工具里重新解释自己。

## 三层模型（Vision §5.4 要求区分）

| 层 | 内容 | 例 |
|---|---|---|
| 标签定义 | 维度名称、含义、允许取值域 | Thinking Style / Expertise / Interest / Methodology / Project Association |
| 取值 | 具体值 + 挂载对象 | 「先反例后验证」← 挂在 Chunk#42 |
| 作用域 | 该值有效的范围 | 全局 / 某 Project / 某 Context |

**User Profile** 是特权类别：聚合跨 Chunk 的用户特征（技术背景、编码偏好、工作风格），面向外部 Agent 输出（联动 PLAN-6）。

## 现状 → 缺口

| 要求 | 现状 | 缺口 |
|---|---|---|
| 三层模型 | `domain` 单选 5 值 | tags/tag_values 两张表 + 作用域字段 |
| 防标签混乱 | 无 | 定义受控：新增维度需显式创建，取值可自由 |
| 可见性治理 | 无 | tag 级可见范围（联动 PLAN-7） |
| User Profile 输出 | 无 | profile 聚合视图 + API/MCP 只读端点 |

## 阶段

- **A8-1 定义层**：预置 6 个 Vision 维度 + 管理 UI（仅定义，不动数据）。
- **B8-1 取值与作用域**：给 Chunk 打标签（含作用域）、按标签筛选、Overview 标签概览。
- **B8-2 User Profile**：聚合页（可编辑确认）+ 只读输出端点（供 PLAN-6）。
- **C8-1 智能联动**：Agent 建议标签值（提案制）、Detector 找缺失/矛盾标签。

## 边界

不做自由 folksonomy（维度必须先定义）；不做标签自动权威赋值；Profile 不做心理测评式推断（只聚合用户确认的事实）。

## 验证

未定义维度无法赋值；同一取值换作用域后可见性正确；MCP 读 Profile 只返回用户确认过的条目。

## 待决策

1. 首批维度就用 Vision 表里那 6 个？
2. `domain` 字段保留（兼容）还是并入 Meta Tag？（建议并入，PLAN-1 裁决时定）
