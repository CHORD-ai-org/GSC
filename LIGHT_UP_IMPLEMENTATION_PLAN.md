# LIGHT_UP_IMPLEMENTATION_PLAN.md — 实现计划

> Status: `EXECUTED` (S1–S6, 2026-11-20) — 后端零改动；验证见 `IMPLEMENTATION_STATUS.md`「Light Up checks」。

> 原则：后端零改动。所有能力先分类，再动代码。

## 1. 能力分类

| 能力 | 分类 | 依据 |
|---|---|---|
| 原文入库/URL 预览/Agent 建议/提案治理/打标 | **Existing** | `/api/items`、`/api/ingest/url`、`/api/agent/propose`、`/api/tags/values` 全部现成 |
| 统一 Composer（拖放/粘贴/Ctrl+O/URL 横幅） | Frontend-only | File API + 既有 ingest |
| Understand 阶段标签 | Frontend-only | 对应真实的 normalize→segment→name 同步管线，非假进度 |
| Semantic Object Sheet + 三态芯片 | Frontend-only | 复用 `SemTag`（PLAN-5）与 tokens |
| Overview/Chunks/Source 三视图 + offset 高亮 | Frontend-only（增强） | `segmentText` 增加 offset 区间映射回原文；映射失败显式「无精确引用」 |
| 策展：采纳/拒绝/延后/批量/合并/拆分 | Frontend-only | 全部发生在未入库的行状态上（D-047 人审门内）；入库仍是逐条 createItem |
| Sheet 内 Meta Tags 待入库行 | Frontend-only + Existing | 行状态存 tag 意向，入库后逐条 POST `/api/tags/values` |
| Illuminate 完成页 | Frontend-only | 消费 createItem 返回的条目 |
| LLM 智能切块/自动聚类/入库后 source 高亮（offset 持久化） | **Deferred** | 分别归 PLAN-4 C4-1、PLAN-1、模型扩展 |
| 需后端扩展 | **无** | —— |

## 2. 文件与组件

| 文件 | 动作 | 内容 |
|---|---|---|
| `src/lib/lightup.ts` | 增强 | `Segment` 增加 `start?: number; end?: number`（对原文的 offset 区间）；`segmentText` 内容→原文 indexOf 映射，失败留 undefined；加 `mergeSegments`/`splitSegment` 纯函数 |
| `src/components/SemanticObjectSheet.tsx` | 新增 | Sheet 组件（语义名 inline 编辑、元数据行、原文摘录、tag 行、动作组） |
| `src/views/lightup.module.css` | 新增 | 编辑排版体系（字型角色、留白、状态色引用 tokens） |
| `src/views/lightup.tsx` | 重写 | 阶段式 Studio：Capture→Understand→Shape→Curate→Illuminate + queue 入口保留 |
| `src/app/App.tsx` | 改 | `persistSegments` 返回已建条目数组；`onPropose`/`tagDefinitions`/`tagDimNames` 传入 |
| 测试 | 增 | `lightup.test.ts` 加 offset/merge/split 用例 |

## 3. 垂直切片（每片独立可用）

1. **S1 数据层**：offset 增强 + merge/split 纯函数 + 测试（不动 UI）。
2. **S2 Capture**：统一 Composer（拖放/URL 横幅/计数）替换原输入区。
3. **S3 Understand+Shape**：阶段标签 → Sheet 集合 + Overview/Chunks/Source 三视图（含高亮联动）。
4. **S4 Curate**：状态机 + 批量/合并/拆分 + tag 行。
5. **S5 Illuminate**：完成页 + App 接线（persistSegments 返回值）。
6. **S6 收尾**：queue 并入 Studio 尾部、键盘可达、reduced-motion、文档。

## 4. 风险与边界

- offset 映射依赖「切块内容在原文中可定位」——合并块/归一化改写过的内容可能失配；失配走「无精确引用」，不伪造。
- 合并/拆分只作用于未入库行；入库后编辑走既有详情页（不在本次范围）。
- 不动 proposals 队列语义；不动手动 NewForm；不动 Composer 快路径行为。
