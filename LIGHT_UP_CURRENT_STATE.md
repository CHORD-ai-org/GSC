# LIGHT_UP_CURRENT_STATE.md — Phase 1 实现审计

> 2026-11-20 · 基于真实代码核对（`src/views/lightup.tsx` / `src/lib/lightup.ts` / `src/app/App.tsx` / `server/ingest/html.ts`），非设计假设。

## 1. 现有用户旅程

| 入口 | 路径 | 现状 |
|---|---|---|
| Start Composer | 输入文本 → `submitComposer` → 直接 `createItem(raw.document)` → 跳 Recently | 短笔记快路径，**零审阅**（首行截断作标题，source_label=`composer:<mode>·<model>`） |
| Light Up → 手动输入 | NewForm 逐字段创建单条 | Vision 3.1-A 手动模式，独立表单 |
| Light Up → 采集管线 | URL 抓取/剪贴板/多文件 → textarea →「生成审阅」→ 行式审阅表 →「入库 N 条」 | 规则切块（D-047 人审在前端行上完成，再批量 POST） |
| Light Up → 提案队列 | Agent 建议 / Detector → proposals → 接受/拒绝 | 面向**已入库**条目，接受即应用（PLAN-4） |
| Ctrl+O | Start → `fileInputRef` → `importFileObject` | 直接落 `raw.filecontent`（快路径） |

## 2. 现有组件结构

- `LightUpView`（lightup.tsx，309 行）：三标签状态机（manual/pipeline/queue）+ `SegmentRow[]` 行级编辑（keep 复选、title/type/author/locator、丢弃按钮）。
- `src/lib/lightup.ts`：`normalizeText` / `segmentText`（段落+Markdown 标题切块、<80 字符并块）/ `suggestTitle`（首句截断）/ `isFastPath`（**无调用方**——死代码，快路径实际由 submitComposer 无条件直建实现）。
- App 接线：`persistSegments`（逐条 createItem，成功后 selectItem+go('raw')）、`proposeForSegments`（/api/agent/propose 回填行标题）、`renderLightUpManual`（NewForm）。
- 设计资产：`SemTag`（原文/确认/机器/异常四态芯片）、tokens.css 双主题、`--sem-*` 语义色已存在（PLAN-5）。

## 3. 现有后端契约（全部保留）

| 能力 | 契约 | 语义 |
|---|---|---|
| 原文入库 | `POST /api/items`（type/title/source_label/fields.content_text） | 原文逐字；history 记 created |
| URL 预览 | `POST /api/ingest/url` | **只预览不落库**（D-048），SSRF 防护后仍如此 |
| 机器建议 | `POST /api/agent/propose` | 语义名建议，回填=人审确认 |
| 提案治理 | `GET /api/proposals`、`POST /api/proposals/:id/resolve` | 队列接受/拒绝，接受即应用 |
| 打标 | `POST /api/tags/values` | 受控维度 + 自由取值（PLAN-8） |

## 4. 必须保留的约束

1. **D-047 人审门**：未确认的机器解释不得持久化；行级审阅即确认。
2. **原文逐字**（Vision 2.1）：语义名/解释不覆盖原文。
3. **短笔记快路径**：不经切块仪式（Composer 直建行为保留）。
4. **URL 只预览**：抓取内容进入输入框后才可随审阅入库。
5. **提案→确认流**：不绕过 resolve。

## 5. 主要 UX 问题（本次重设计靶点）

1. **三个视觉无关的标签**（手动/管线/队列）——同一行为被拆成三个世界；用户感受不到「同一个 Light Up」。
2. **审阅行是行政清单**：keep 复选 + 平铺输入框，无视觉层级；语义名不突出；原文被 400 字截断藏在 `<pre>` 里。
3. **三态信息不分**：原文 / 机器建议 / 用户修改在视觉上完全一样（违反 Vision §8）。
4. **无 Source 联动**：看不到某个 chunk 对应原文哪一段（切块无 offset 记录）。
5. **无完成体验**：入库后直接跳 Raw 详情，没有「信息已获得身份」的确认时刻。
6. **无拖放/无真实处理态**：按钮工具栏式输入；「生成审阅」要么瞬间要么卡住，无阶段反馈。
7. `isFastPath` 死代码；快路径与管线之间的关系没有任何表达。

## 6. 拟修改面

| 文件 | 动作 |
|---|---|
| `src/lib/lightup.ts` | 增强：segment 结果带 offset 区间（映射回原文，映射失败→显式「无精确引用」） |
| `src/views/lightup.tsx` | 重写为阶段式 Studio（Capture→Understand→Shape→Curate→Illuminate），保留 queue 为独立可达区 |
| `src/views/lightup.module.css` | 新增（编辑排版体系，不动 views.module.css） |
| `src/components/SemanticObjectSheet.tsx` | 新增：Semantic Object Sheet |
| `src/app/App.tsx` | `persistSegments` 返回已建条目（Illuminate 需要）；tag definitions 传入 |
| 后端 | **零改动**（本重设计全部落在 existing / frontend-only 两档） |

## 7. A2-1 / B2-1 / B2-2 对位

- A2-1（切块+命名规则库）✅ 已实现（`lightup.ts` + 5 单测）——本次仅加 offset，不动规则。
- B2-1（URL 摄取端点）✅ 已实现（`/api/ingest/url` + SSRF）——行为不变。
- B2-2（Light Up 工作区 UI）✅ 已实现但是**行政清单式**——本次重写的正是它。
