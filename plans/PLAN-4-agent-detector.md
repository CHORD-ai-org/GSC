# PLAN-4 — 智能层：GSC Agent 与 Detector

Status: `A4-1/B4-1/B4-2 已执行` — 2026-11-20（用户「开始执行PLAN-4」）。裁决：D-052 OpenAI 兼容 provider（一并回答 D1）、D-053 统一提案队列（+dedupe/metadata 类型）、D-054 接受语义分种类+单进程手动触发。B4-1 的真实模型调用待网络与 key（桩测通过）；C4-1（主题建组/体检报告）未做。 · 源：`PRODUCT_VISION.md` §4 · 依赖：PLAN-1 ✓

## 目标场景

Light Up 一篇长文后，GSC Agent 给出：8 个语义名、类型建议、3 个 Meta Tag 债选、2 条关联——全部带出处，落进提案队列等用户确认。同一时间 Detector 在后台发现：两个 Chunk 80% 重叠（查重）、一个 Cluster 主题正在成形（建议建组）、4 个条目缺 source（元数据体检）。用户早餐时间扫一遍队列，10 秒批完。

## 分工铁律（Vision §4.2）

| | GSC Agent | Detector |
|---|---|---|
| 角色 | 解释并**提议** | 观察并**标记候选** |
| 触发 | 采集管线内（Light Up/Sync 时） | 巡检式（存量信息） |
| 输出 | 语义名/分类/标签/关联提议 | 查重/建组候选/变更/缺元数据/主题涌现 |
| 落点 | proposals（待审） | candidates（待审） |

两者都**不得**把不确定解释写成权威用户信息（原则 §10-4）。

## 现状 → 缺口

| 要求 | 现状 | 缺口 |
|---|---|---|
| Agent 访问现有信息空间 | 无智能层；D1（provider 接入）PROPOSED | 只读检索面（PLAN-6 API 复用）+ provider 适配 |
| 三层输出区分 | `origin: agent` 字段闲置 | proposal 模型 + UI 标识 |
| Detector 巡检 | 无 | 候选类型定义 + 扫描任务（本地定时） |
| 人工治理 | 无 | 提案队列 UI（accept/edit/reject） |

## 阶段

- **A4-1 提案队列**：proposals/candidates 表 + 队列 UI（先手动录入提案跑通治理流）。
- **B4-1 Agent 接入**：D1 的 provider（Deepseek/本地端点）→ 语义名/分类/标签提议，带原文引证。
- **B4-2 Detector 巡检**：查重（文本相似度，非向量库）、缺 source 检查、关联候选（共现/引用）。
- **C4-1 主题与建组**：主题涌现检测 → Cluster 建议（喂 PLAN-1）；跨源知识体检报告。

## 边界

不做自主改写用户数据；不做向量库/图库（相似度用轻量文本比对起步）；Agent 无写权限，只能产提案。

## 验证

给定固定语料，Agent 提议可复现且逐条可溯源；拒绝的提案不落库；Detector 查重对人工构造的重复对命中率 100%。

## 待决策

1. Agent 与 Detector 是同进程模块还是各自独立跑批？（先单进程，验证边界）
2. provider 选型（D1 未决问题在此一并回答）。
