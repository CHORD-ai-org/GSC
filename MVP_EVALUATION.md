# MVP_EVALUATION.md — Phase 06: Evaluation & Integration Prep

> 2026-11-21 executed against the live GSC API (`/api/*`, token auth) — real data, no mocks.
> Scenarios per `MVP_USER_FLOWS.md` §4. Evidence runner: `scripts/phase06-scenarios.py`.

## 1. Scenario A — Research（论文研究）

| Step | Action | Result |
|---|---|---|
| A1 | 导入论文（`raw.document` + `source_label: arxiv:1706.03762`） | 201 · `raw_eb460681…` |
| A2 | 创建 Hypothesis（`claim`）+ Concept（`definition`） | 201 × 2 |
| A3–A4 | `derived_from` 两对象 → 论文 | 201 × 2 |
| A5 | `supports` Hypothesis → Concept | 201 |
| A6 | 检视 Hypothesis | 200 · `origin=user` · outgoing relations = 2 |

**判定：通过。** 论文导入 → 假设/概念 → 双向溯源（`derived_from`）+ 论证关系（`supports`）→ 详情可检视。

## 2. Scenario B — Knowledge Organization（知识组织）

| Step | Action | Result |
|---|---|---|
| B1 | 创建 Concept + Methodology（`name`/`steps`） | 201 × 2 |
| B2–B3 | `related_to` 双向 | 201 × 2 |
| B4 | 检视 Methodology 两端 | 200 · out=1 · in=1 |

**判定：通过。** 概念↔方法论双向关系可表达、两端可检视。

## 3. Scenario C — Decision Continuity（决策连续性）

| Step | Action | Result |
|---|---|---|
| C1 | 记录 Evidence（`content_text` + `locator`）→ Decision（`statement`/`reasoning`/`alternatives`/`consequences`） | 201 × 2 |
| C2 | `derived_from` Decision → Evidence | 201 |
| C3 | 编辑 Decision（PATCH `statement`） | 200 |
| C4 | 检视 | 200 · statement 已更新 · 来源关系保留 |

**判定：通过。** 证据→决策（带理由/替代/后果）→ 附来源 → 可编辑且溯源不断。

## 4. Scenario D — Context Organization（上下文组装）

| Step | Action | Result |
|---|---|---|
| D1 | 创建 Knowledge Context（subject/scope/purpose） | 201 · `ctx_00997322…` |
| D2 | 显式添加 3 个已有对象为成员 | 201 × 3 |
| D3 | 检视成员列表 | 200 · members=3 |

**判定：通过。** Context 由既有对象显式组装，不复制底层信息，成员可检视。

---

## 5. 五个评估问题（Five evaluation questions）

1. **用户能否采集信息并保留来源？—— 能。** A1/C1：`source_label`/`locator` 保留，origin 区分 user/agent/import。
2. **采集内容能否成为独立可复用的结构化对象？—— 能。** A2/B1/C1：类型化字段（claim/definition/steps/statement+reasoning）+ 稳定 id + 详情页独立寻址。
3. **关系能否表达真实推理？—— 能。** `supports`/`challenges`/`derived_from`/`related_to` 全部可表达（A3–A5/B2–B3/C2），两端可检视（B4）。
4. **用户能否组装目的明确的 Context 并复用？—— 能。** D：显式成员制（member_ids），Context 是视图而非副本；Agent 上下文导出（`buildAgentContext`/GSC-CONTEXT.md）复用同一数据。
5. **信息是否端到端可追溯？—— 能。** origin + source_label + 关系溯源 + 修改留存（C3→C4）；机器产物一律走提案→确认（D-042），不直接写入。

## 6. Known limitations（如实记录）

- 单机本地持久化（PGlite，D-026）；无跨设备同步。
- 无修改历史时间线 UI（数据面有 events/updated_at，界面未展开）。
- `alternatives`/`consequences` 为自由字段，无结构化校验。
- 关系 stance（supports/challenges）在 Canvas 的可视化仍弱（数据正确，展示待打磨）。
- 本评估是功能正确性验证，非大规模性能验证。

## 7. Integration requirements（Thylas 边界，为集成准备）

- 契约面：REST `/api/*`（token 鉴权，read/rw 分级）+ MCP server（`gsc_search`/`gsc_get_cluster` 等 9 工具）。
- 上下文交付：`buildAgentContext` → `GSC-CONTEXT.md`；按 Context 导出单包（D 系列规划）。
- 稳定面：ItemDTO/RelationDTO/ContextDTO 形状、`origin`/`source_label` 语义、提案→确认生命周期。
- **不做**：完整 Thylas 集成（本阶段仅准备契约，不实现）。

## 8. Verdict

**Phase 06 COMPLETE — 2026-11-21。** 场景 A–D 全部在真实系统上执行并留证；五个评估问题均有证据支撑的回答；已知局限与集成契约如上。预期价值（信息保身份、可复用、可追溯、可组装）在 MVP 范围内成立。
