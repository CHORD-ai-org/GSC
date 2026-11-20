# PLAN-7 — Shared Clusters 与协作信息空间

Status: `PROPOSED` · 源：`PRODUCT_VISION.md` §9 · 依赖：PLAN-6（授权面）、PLAN-8（可见性治理）· 前置：改 `DESIGN_BOUNDARIES.md` 权限边界并获批

## 目标场景

三人研究小组共有一个 Cluster「Agent Architecture Research」：每人各自 Light Up 的 Chunk 保留在自己名下，Cluster 成员互相可见；A 只读、B 可加条目、C 可编辑组织；任何人的私有信息都不会因为共享 Cluster 而泄露；退出共享后各自原文完好。

## 四分离（Vision §9）

| 概念 | 含义 | 表设计方向 |
|---|---|---|
| Cluster ownership | 谁创建/删除/改身份 | `clusters.owner_id` |
| Cluster membership | 哪些 chunk 在组里 | `cluster_members`（多对多，可属多组） |
| Shared access | 谁可进入 + 等级 | `cluster_shares(user, role: view/add/edit/admin)` |
| Information ownership | 原文归属（不随共享转移） | items.owner（随 PLAN-1 加） |

## 现状 → 缺口

无用户/账户/权限任何概念（本地单用户 MVP）；`DESIGN_BOUNDARIES.md` 明确排除权限系统。一切从零，且必须先走边界变更流程。

## 阶段

- **A7-1 边界与身份**：DESIGN_BOUNDARIES 变更提案获批；账户概念落地（本地→最小多用户）。
- **B7-1 共享 MVP**：Cluster 创建者邀人（view/add 两档即可）；成员可见性校验进 API。
- **B7-2 权限完备**：edit/admin 档、退出/回收、跨用户 provenance 展示。
- **C7-1 社区形态**：公开/受邀共享集合、复制他人 Cluster 结构（不含未授权原文）。

## 边界

不做组织/团队层级、不做审批流、不做冲突合并（并发编辑记录 events 由用户裁决）；共享永不隐式扩大可见范围。

## 验证

A 共享给 B 后：B 能读成员 chunk、读不到 A 的其他任何信息；回收立即失效；审计事件完整。

## 待决策

1. 账户体系自建还是接入外部身份（影响 PLAN-6 token 模型）？
2. 首个共享形态：只读分享链接先做？
