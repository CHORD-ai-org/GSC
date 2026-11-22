# REMAINING_WORK.md — 全项目未完成项统一清单（v5 · FINAL）

> 2026-11-21 22:30 · **P1 / P2 全部清零**（OAuth 为外部阻塞例外）。

## ✅ 末批完成（D-087）

- **骨架屏**（GAP-09）✅：`SkeletonRows` 微光行（prefers-reduced-motion 降级），Raw/对象列表
  加载态替代空白页。
- **批量打标入口**（GAP-10）✅：列表「选择」模式 → 勾选行（✓ 标记+高亮）→ 批量条
  （维度下拉+值输入+打标），一次为 N 项打标（tag_values 唯一索引含 item_id，同值可打多条目）。
  截图 bulk-tag.png 验证。

**验证基线**：tsc=0 · lint=0 · vitest **135/135** · 截图验证。

## 状态总览

- **P0/P1：全清**（除 Notion/Drive/X full OAuth —— 需平台开发者凭证，外部阻塞）。
- **P2：全清**（11/11）。
- **P3（Vision/远期，未排期）**：语义/向量检索（GAP-14）· Context 粒度授权（GAP-15）·
  API SDK 生态（GAP-16）· 跨设备/云端（GAP-17）· 部署态 PostgreSQL 适配。
