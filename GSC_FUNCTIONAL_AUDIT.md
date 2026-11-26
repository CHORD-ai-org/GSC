# GSC_FUNCTIONAL_AUDIT.md — GSC 功能完整性检查报告

审计日期：2026-11-25。方法：**以代码为证据**——后端功能面=router.ts 路由清单（60 条 pattern）、
数据面=schema.ts（35 张表）、前端面=Sidebar 视图与组件、测试面=vitest（51 文件/237+1skip）；
对照计划=GOALS_2026-11-23 + DEVELOPMENT_ROADMAP + 各设计文档。

## 1. 数据面（35 表，全建且迁移链完整）

| 域 | 表 | 状态 |
|---|---|---|
| 信息 | items, item_content, relations, events | ✅ |
| 组织 | contexts, context_members, clusters, cluster_members, cluster_shares, cluster_share_events | ✅ |
| 标注（G5） | tag_definitions, tag_values, meta_groups, meta_tag_groups, assignment_params, item_meta_params | ✅ |
| 提案 | proposals（+related_definition_id） | ✅ |
| 采集（G2） | sources, source_snapshots, capture_tasks, schedules | ✅ |
| 对话（G7） | conversations, messages, message_blocks, tasks, task_stages, uiflows, task_patches, task_events | ✅ |
| 缩放（G4 前半） | outline_nodes | ✅ |
| 基建 | users, idempotency_keys, spatial_layouts | ✅ |

## 2. 后端功能面（60 路由 pattern，按域）

| 域 | 路由 | 状态 |
|---|---|---|
| 信息 CRUD+回收站 | items CRUD、trash/restore/purge、search、events、outline、ensure-titles | ✅ |
| 组织 | contexts CRUD/members · clusters CRUD/members/shares · relations | ✅ |
| 标注 | tags definitions/values CRUD · meta/groups · meta-params · profile | ✅ |
| 提案 | proposals 列表/resolve（applying） | ✅ |
| 采集 | ingest/batch、ingest/url、sources CRUD/sync、capture、schedules CRUD/run | ✅ |
| 集成管理 | integrations files/status/test | ✅ |
| 对话（G7） | conversations CRUD、messages、tasks GET/PATCH/advance、uiflows GET/complete | ✅ |
| Agent | agent/propose、agent/detect | ✅ |
| 基建 | users、tokens CRUD、llm config/check/usage、news CRUD、meta/mcp、openapi、docs | ✅ |

## 3. 前端功能面

- 视图：start（composer）/overview/recently/raw/objects/lightup/clusters/contexts/sync/settings/docs/user/canvas/**chat**（G7）。
- 组件：Composer、Sidebar（双最近+置顶+黄点）、TagEditor、FlowPanel（丝滑 stepper）、TaskCard、
  CommandPalette、ReceiptPrinter、Onboarding 等 ~20 个。

## 4. 计划对照

| 目标/Phase | 状态 | 证据 |
|---|---|---|
| G1 组件拆分 | ✅ v1 | component-list.md |
| G2 三端采集闭环 | ✅ | D-103/104/108 + 集成管理面 |
| G3 插件兼容矩阵 | ✅ 矩阵成文 | component-list.md（MCP 出口 🔜） |
| G4 缩放层级 | 🟡 前半 | D-107 标题管线；**后半=多级折叠浏览未做** |
| G5 Meta-tag | ✅ 完整 | D-105/106 |
| G6 信息模型 v1.0 | ⬜ 未开始 | INFORMATION_MODEL 行为未逐条落地 |
| G7 对话 | ✅ 完整 | D-110~113 + 正式验收 PASS |
| LOCAL_SIM 采集 | ✅ | compose db/api/worker + 桌面 bat |
| UI 保真 | ✅ R1–R5 | UI_PARITY_AUDIT 修复结论 |

## 5. 缺口清单（分级）

### 🟡 半成品（有地基，缺后半）
1. **G4 后半**：原始内容多级折叠/展开浏览（outline 数据已有，浏览 UI 未做）。
2. **MCP 只读出口**（G3 计划 🔜）：meta/mcp 元信息有，MCP server 本体未建。
3. **对话问答**（口径第 3 件事）：带引用 Q&A 未做（MCP 同源）。
4. **Composer 全量接入**：对话页输入仍是轻量版（附件/模型真实交互后置）。
5. **WS/流式**：任务卡 2s 轮询制。

### ⬜ 未开始（计划内）
6. **G6 信息模型 v1.0**（本周口径，最大缺口）。
7. 云同步/多用户（口径外，后置）· 向量检索 · 移动端 · CLEO 自动意图。

### 🔧 技术债（非阻塞，已记录）
8. 令牌收口（UI_FOUNDATION_RESEARCH 路线 B）。
9. 卡内 PATCH kind 启发式固定 compose。
10. bounded tool-loop 仅插座（StageExecutor）。
11. **环境**：LLM key 401 失效待换（影响所有 LLM 缝合点的真值评测与 benchmark B2）。

## 6. 结论

**核心闭环完整**：采集（三端+定时+URL）→ 信息（CRUD/回收站/检索）→ 组织（关联组/上下文）→
标注（组/标签/参数）→ 提案（确认制全链）→ **对话工作面**（任务卡/管线/DSL/停点）→
集成管理——G1/G2/G3/G5/G7 五目标完整交付，UI 达保真标准。
**三大缺口**：G4 后半（浏览）、G6（信息模型）、MCP 出口；其下是问答与 Composer 全量。
建议下一批顺序：**换 key → G6 信息模型（G4/G5 的语义底座）→ G4 后半 → MCP 出口**。
