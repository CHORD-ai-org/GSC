# plans/ — 长线计划（Vision v0.2 驱动）

Status: 全部 `PROPOSED` — 2026-11-20 制定，未逐条获批前不进入实现。源文档：`PRODUCT_VISION.md`（v0.2）。
与 `DIVERGENCE_PLAN.md` 的关系：那边是**近线**（从现有结构发散，D7 已做）；本目录是**长线**（按 Vision 章节铺的轨道）。近线项目在备注里给出对应关系。

## 0. 词汇对照（Vision ↔ 当前代码，先解决再动工）

| Vision 术语 | 当前代码/文档 | 关系 |
|---|---|---|
| Chunk（语义命名的信息单元） | `items`（raw.* 原始 + object.* 对象） | ✅ 已裁决（D-042）：Chunk=统称，双类保留，映射见 `INFORMATION_MODEL.md` §11 |
| Semantic Name | `items.title` | ✅ 已裁决（D-043）：即 `title`，机器命名走提案层 |
| Cluster（关联分组） | `clusters` + `cluster_members`（PLAN-1 实现中） | ✅ 已裁决（D-045）：多归属、显式成员 |
| Context（目的性视图） | `contexts` + 显式成员 | 已对齐 ✓ |
| Meta Tag | `domain` 单选字段 + `tag_definitions`/`tag_values` 三层 | ✅ 对齐（D-064…D-066）；`domain` 保留并行（D-065） |
| Light Up（主动采集） | Composer 捕获 / 文件导入 / New 表单 | 雏形；缺管线 3–7 步（PLAN-2） |
| Sync（外部源持续采集） | `sources` 表 + GitHub 适配器（PLAN-3 A3-2 实现中） | ✅ 已裁决（D-049/D-050）：Sync 专指源采集，原导出页改名 Export；同步条目 `origin: import` + `sync:<kind>:<ref>` |
| GSC Agent / Detector | 无；DIVERGENCE D1 是模型接入 | 智能层整体缺位（PLAN-4） |
| GSC API / MCP / Provider | `node:http` 内部 API + GSC-CONTEXT.md 导出 | 契约雏形在 `src/lib/*`，无对外授权面（PLAN-6） |
| Shared Cluster / 权限 | 无；DESIGN_BOUNDARIES 明确排除权限系统 | 需要先解除该边界（PLAN-7） |

## 1. 轨道索引

| 计划 | 覆盖 Vision § | 一句话 | 依赖 | 远期阶段 |
|---|---|---|---|---|
| [PLAN-1 信息模型对齐](PLAN-1-information-model.md) | §2.1 §5 | Chunk/Cluster/Meta Tag 与现有 items/contexts 的模型合并或映射 | — | A→C **A/B 段已执行 2026-11-20（D-042…D-045）** |
| [PLAN-2 Light Up 采集](PLAN-2-light-up.md) | §3.1 | 8 步管线 + 手动/Agent 辅助双模式 | PLAN-1（A 阶段后可先行雏形） | A→C |
| [PLAN-3 Sync 外部源](PLAN-3-sync-sources.md) | §3.2 | 外部源连接（X/GitHub/Notion/Drive）+ 品牌资产 + 同步状态 | PLAN-1 | A→C |
| [PLAN-4 Agent + Detector](PLAN-4-agent-detector.md) | §4 | 解释/提议（Agent）与观察/候选（Detector）分工 + 人工治理 | PLAN-2、模型接入（D1） | A→C |
| [PLAN-5 Chunk 界面](PLAN-5-chunk-interface.md) | §8 | 分区呈现 + 稳定色彩语义 + 时间演化可视化 | PLAN-1 | A→B |
| [PLAN-6 API / MCP / Provider](PLAN-6-api-mcp.md) | §6 | 对外授权面：API 契约、MCP server（Codex/Claude Code/Pi）、SDK | PLAN-1、权限最小集 | A→C |
| [PLAN-7 共享与协作](PLAN-7-shared-clusters.md) | §9 | Shared Cluster：所有权/成员/共享访问/权限四分离 | PLAN-6、PLAN-8 | B→C |
| [PLAN-8 Meta Tag 与 User Profile](PLAN-8-meta-tags-profile.md) | §5.4 | 标签定义/取值/作用域三层 + User Profile 跨应用输出 | ✅ A/B 段执行 | A→C |

## 2. 阶段口径

- **A（地基）**：模型裁决、命名统一、契约稳定。不解决 A 就动工 B/C 会返工。
- **B（成形）**：单条轨道的 MVP 端到端可用（含验证）。
- **C（规模）**：多源/多用户/多消费端的完整形态。

## 3. 全局边界（Vision §10 原则落到执行）

1. 原文与机器解释必须可区分存储与展示（Preserve Before Interpreting）。
2. Agent/Detector 只提议，用户确认前不算权威（Human Governance）。
3. 不引入向量库/图库/队列/微服务作为 MVP 基建（DESIGN_BOUNDARIES 不变）。
4. 权限系统只在 PLAN-6/7 明确需要的最小范围内引入，需先改 `DESIGN_BOUNDARIES.md` 并获批。
5. 每条轨道开工前按 AGENTS.md 补齐七要素任务卡；阶段收尾走 Handoff 报告格式。
