# DATABASE_DESIGN.md — 数据库设计

> 2026-11-20 · 与 `server/persistence/schema.ts` + migrations 0000–0007 一一对应。ER 为文本表（无图形依赖）。

## 1. ER（文本）

```
users 1─∞ items(owner_id)          users 1─∞ clusters(owner_id)
users 1─∞ cluster_shares ∞─1 clusters
items 1─1 item_content             items 1─∞ events
items 1─∞ relations(from_id)  1─∞ relations(to_id)   [edge unique(kind,from,to)]
items ∞─∞ context_members ∞─1 contexts               [PK(context_id,item_id)]
items ∞─∞ cluster_members ∞─1 clusters               [PK(cluster_id,item_id)]
items 1─∞ proposals(target_id)     proposals.related_id → items
items 1─∞ tag_values               tag_definitions 1─∞ tag_values
sources (独立；密钥在库外)
idempotency_keys (key+endpoint → 响应快照)
```

## 2. 约束与不变式

| 表 | 约束 | 保护什么 |
|---|---|---|
| items | PK id；owner FK→users | 身份稳定、归属可溯 |
| item_content | **PK item_id**（1:1）；FK cascade | 原文唯一、随条目清 |
| relations | **unique(kind,from,to)** | 同语义边不重复 |
| context_members / cluster_members | 复合 PK | 成员不重复；多归属天然允许 |
| cluster_shares | 复合 PK(cluster,user) | 共享唯一 |
| tag_values | **unique(def, COALESCE(item_id,''), value, scope)**（0007） | 重复赋值拒绝 |
| proposals | FK cascade | 目标删除则提案清理 |
| idempotency_keys | PK(key,endpoint) | 重放同一响应 |

级联策略：**全部 FK `ON DELETE CASCADE`** —— 条目删除即清理其内容/关系/事件/成员/提案/赋值（删除语义可预测：一次删净，无孤儿）。恢复语义走备份（`db:backup`/`db:restore`）；软删除 DEFERRED（O4-1）。

## 3. 索引

items(type) / items(updated_at 经查询序) / events(item_id) / tag_values(definition_id, item_id) / proposals(status 经查询过滤)。规模量级（个人信息空间）下查询皆 <5ms（eval 实测）。

## 4. JSONB 策略

**不用 JSONB 承载领域结构**。唯一半结构面是 `item_content` 的按类型字段列（content_text/definition/author/locator/…），列是显式的（白名单校验），非自由 JSON。

## 5. 迁移策略

- 纯 SQL、幂等（`IF NOT EXISTS`）、启动全量重放；顺序 0000→0007。
- 破坏性变更禁止静默：先备份（`db:backup`）再迁移；数据清理（如 0007 去重）保留最早行。
- 迁移版本表 DEFERRED（当前启动重放对 ≤10 个迁移是可靠且可审计的）。

## 6. PostgreSQL 就绪（DEFERRED-O2-5）

drizzle 同构层已隔离在 `server/persistence/client.ts`；`DB_ADAPTER=postgres` 适配器 + docker 验证归 M3（D-068）。当前 PGlite 语法全部为标准 PostgreSQL 子集，无方言私货。
