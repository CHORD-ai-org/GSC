# SEMANTIC_TITLE_PLAN.md — 语义标题 pipeline（G4 前半，⑤ 号管线）

Status: `PROPOSED` — 2026-11-24，待确认后执行。
口径：标题=语义总结（GOALS G4 验收：「标题由语义总结生成（走提案确认）」）。示例风格钉死：
列表行「导师周会改期至周四 14:00」（不是 mail_01.txt）、段落小标题「时间变更」「地点 A305」
「请带 slides」。提案制不变：机器生成永远是提案，人确认才落。
GOALS 三个待定点本计划拍板（见 §5，沿暂定默认）。

## 0. 现场（已核对到行）

| 事实 | 证据 |
|---|---|
| Segment 已有三态命名溯源 + 偏移区间 | `src/lib/lightup.ts` `nameOrigin: 'rule' \| 'agent' \| 'user'`，start/end |
| 规则名建议已存在（首行截取式） | `lightup.ts` `suggestTitle()`——正是「mail_01.txt 式」要被语义总结替换的东西 |
| semantic_name 提案种类已存在 | `src/lib/proposals.ts:2`；MCP `gsc_propose` 同 kind |
| LLM 批量命名已在跑（Light Up 通道） | `server/agent/proposer.ts:20-23`（≤80 字符、JSON 数组批、rationale+quote） |
| LLM 封装达标（超时/重试/计量/多供应商） | `server/agent/llm.ts`（D-052 + P0-A） |
| 缩放/折叠 UI 未建（G4 整体 ⬜） | GOALS:13；`CanvasTreeView` 有树但非原始文档缩放 |
| G4 待定点 | GOALS:87：①固定 4 级短文档自适应 ②段落先折叠、segment_id 后置 ③按需生成省队列 |

## 1. 任务卡（AGENTS.md §3）

- **Purpose**：原始信息的每一层浏览都以语义总结为标题——用户扫列表/大纲就知道内容是什么，
  不用逐条打开读原文。
- **Scope**：大纲节点模型（L1–L4）+ 按需语义标题生成（LLM 批量/父节点）+ semantic_name 提案
  走查落标 + 一致性/碰撞/重命名策略 + 标题三态展示。L0=条目标题（现有 items.title，不动）。
- **Interacts with**：`src/lib/lightup.ts`（分段复用）、`server/agent/{proposer,llm}.ts`（生成链复用）、
  proposals 语义名通道、新 `server/repo/outline.ts` + 迁移、详情页大纲区、Light Up 表标题列。
- **Does not own**：完整缩放交互（G4 后半的缩放手势/视图，见 §4 C 批边界）、segment_id 段级
  引用（待定点②后置）、全局标题命名空间、批量预生成队列、向量相似度。
- **User flow**：① 打开长文档详情 → 大纲区显示折叠层级（无标题层显示规则名+置灰）→
  ② 首次展开某层 → 自动发起该层标题生成 → 节点出现「提案中」徽标 →
  ③ 提案面批量走查：采纳（标题落定、nameOrigin=agent）/ 拒绝（回规则名）/ 直接改写
  （nameOrigin=user，不走提案）→ ④ 重命名=直接改；重新生成=新提案顶掉旧 pending。
- **Minimum implementation**：outline_nodes 表 + 光谱派生（复用 lightup 分段）+ titler 生成器
  （同父兄弟一次 LLM 批）+ ensureTitles 触发端点 + 大纲区三态徽标 + 提案 accept 落标。
- **Test method**：`npx vitest run`（派生/生成器 stub-LLM/提案落标流）；实拍验收
  （shot 脚本：展开→提案中→采纳→标题落定四态截图）。

## 2. Pipeline（数据流）

```
原始文档 → 大纲派生（L1-L4 节点：start/end 偏移，规则名先占位）
        → 用户首次展开某层（按需触发，待定点③）
        → ensureTitles(item, path): 取该父下缺标题的兄弟节点（≤5/批，对齐中景口径）
        → LLM 批量语义总结（prompt 约束见下）→ semantic_name 提案（source=agent，带 rationale+quote）
        → 人裁决：accept→落 outline_nodes.title + nameOrigin='agent' + 事件溯源
                  reject→保留规则名（可再次生成）
                  直接编辑→nameOrigin='user'，直落不提案（用户改自己的东西不是提案）
```

**Prompt 约束**（一致性本体）：同父兄弟同一请求内生成（风格统一）；携带父标题 + 已确认兄弟标题；
事件式语义总结（动词开头的事实句），≤24 字（L2-L4）/≤80 字（L1）；语言跟随正文；禁原样引文。

**策略**：
- 碰撞：兄弟节点标题不允许重复（生成后检测→重复项自动重生成 1 次→仍重复则标「待改」）；
  **无全局唯一约束**（标题是标签不是 id）。
- 重命名：用户直改即时生效；生成仅在「无标题」时触发，永不覆盖 user 标题。
- 成本：按需 = 只为被展开的层付费；pending 状态视为已生成（不重复触发）。

## 3. 实施批次

| 批次 | 内容 | 出口 |
|---|---|---|
| A 模型+派生 | `outline_nodes` 迁移 + repo（L1-L4，偏移区间，规则名占位）+ 大纲派生纯函数（复用 lightup 分段，短文档自适应） | 派生测试：1k 字文档 ≤4 级、偏移可回指原文 |
| B 生成+提案 | `server/agent/titler.ts`（批量语义总结 + 一致性 prompt）+ `POST /api/items/:id/outline/ensure-titles` + accept→落标 + 三态名 | stub-LLM 测试 + 提案落标流测试；洪峰≤1 批/层/文档 |
| C 展示（G4 后半边界） | 详情页大纲区折叠/展开 + 三态徽标（规则/提案中/已确认）+ 提案面走查接入 | 实拍四态截图；若缩放手势另立 G4 计划，本批只交标题展示件 |

## 4. 与 G4 缩放的关系

G4 验收=折叠多级 + 语义标题两件。本计划是标题管线（含最小折叠展示 C 批）；
缩放手势/远景列表/中景骨架的完整视图体验若单独立项，与本计划共享 outline_nodes 模型，
不重复建。

## 5. 待决策（3 个，`PROPOSED`，附建议）

1. **层级**：固定 4 级 + 短文档自适应（沿待定点①暂定默认）。
2. **触发**：按需生成（首次展开该层），无预生成队列（沿待定点③暂定默认）。
3. **C 批是否同批**：标题展示件 + 最小折叠同批交付、G4 一次验收（建议）vs 标题先行折叠后置。

## 6. 不做

批量预生成/标题队列 · segment_id 段级引用（待定点②后置）· 全局标题命名空间 · 标题翻译/双语存储 ·
向量相似度命名 · 标题自动覆盖已确认/用户标题（提案制红线）。
