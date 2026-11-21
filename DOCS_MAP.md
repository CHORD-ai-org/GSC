# DOCS_MAP.md — 文档地图

> 2026-11-21 整理 · 仓库 72 份 Markdown 的分类、权威归属、时效标注。
> 状态标记：✅ 有效 · ⚠️ 过期（结论已被后续事实推翻）· 🔁 被取代（留档）· 📜 历史快照（自带日期，不算过期）。

## 0. 一分钟结论

- **现状以 `REMAINING_WORK.md` 为准**（2026-11-21，对照代码而非文档字面）。
- **愿景以 `PRODUCT_VISION.md` v0.2 为准**；概念定义以 `INFORMATION_MODEL.md` 为准。
- 计划有三条轴，互不冲突：**Phase 00–06**（工程阶段）→ **R1–R4**（产品路线）→ **plans/PLAN-1…8**（Vision 长线）。
- 实际进度：Phase 00–05 完成、R1–R3 完成、PLAN-1…8 的 A/B 段完成；**Phase 06 价值验证未启动**。
- 13 份文档状态过期、6 份被取代（§7），15 处互相矛盾的陈述（§8）。

## 1. 权威归属 —— 一个问题该查哪份文档

| 问题 | 查这份 | 不要查 |
|---|---|---|
| 产品是什么、为什么做 | `PRODUCT_VISION.md` | — |
| 与 Thylas/WAM 的边界 | `PROJECT_CONTEXT.md` + `DESIGN_BOUNDARIES.md` | — |
| Chunk/Cluster/Context/MetaTag 定义 | `INFORMATION_MODEL.md`（`DOMAIN_MODEL.md` 为正式化） | `MVP_UI_SPECIFICATION.md`（词汇旧） |
| 现在做到哪了 | `REMAINING_WORK.md` | `PRODUCT_CURRENT_STATE.md`（过期） |
| 接下来做什么 | `REMAINING_WORK.md` P0–P3 | 散落的各 `*_PLAN.md` 状态行 |
| 某个决策的依据 | `DECISION_LOG.md`（D-001…D-083） | 各计划文档的自述状态 |
| 已知缺陷 | `KNOWN_ISSUES.md` | — |
| 后端/API 现状 | `BACKEND_CURRENT_STATE.md` + `API_CONTRACT.md` | — |
| 工程进度总账 | `IMPLEMENTATION_STATUS.md`（需先看 §7 补丁说明） | — |

## 2. 愿景 / 定位（3 份）

| 文档 | 一句话 | 状态 |
|---|---|---|
| `PRODUCT_VISION.md` | 愿景 v0.2：把碎片信息变成持久、可寻址、可复用的 Context | ✅ |
| `PROJECT_CONTEXT.md` | GSC 目的 + 与 Thylas/WAM 边界；源宪章在 Thylas 仓 MANIFESTO | 📜 §2 仓库状态是 Phase 00 快照 |
| `README.md` | 仓库导览 + 运行方式 | ⚠️ "PLAN-8 in progress"、Setup 段、目录树均过期 |

## 3. 计划 —— 三条轴

### 3.1 工程阶段轴（Phase 00–06，`DEVELOPMENT_ROADMAP.md` 总控）

| Phase | 内容 | 实际状态 |
|---|---|---|
| 00–02 | 仓库审计 / 信息模型 / MVP 交互设计 | ✅ 2026-11-16 完成 |
| 03 | 核心实现（CRUD/关系/溯源/持久化） | ✅ 2026-11-18，见 `PHASE_03_PLAN.md` |
| 04 | Context 视图（Space vs View） | ✅ 2026-11-19，见 `PHASE_04_PLAN.md` |
| 05 | 浅色 UI shell + Composer/Canvas/Sync | ✅ 2026-11-19，见 `PHASE_05_UI_PLAN.md` |
| 06 | 价值验证（场景 A–D + 五评估问题） | ⛔ PROPOSED 未启动 |

⚠️ `DEVELOPMENT_ROADMAP.md` 自称 Phase 05 "IN PROGRESS"、PLAN-8 "in progress" —— 两处均已过期。

### 3.2 产品路线轴（R1–R4，`PRODUCT_DEVELOPMENT_ROADMAP.md` 总控）

| 路线 | 内容 | 实际状态 |
|---|---|---|
| R1 首次体验 | 账户 / 引导 / 价值陈述 | ✅ |
| R2 找回 | 搜索 / 分页 / 软删回收站 | ✅ |
| R3 管得住 | Token 管理 + 信息演化（outdated/superseded_by） | ✅ |
| R4 连得通 | Shared Cluster 协作 + Sync 调度 | 🔶 进行中（T401/T402） |

配套：`PRODUCT_DEPENDENCY_MAP.md`（依赖图）· `PRODUCT_ACCEPTANCE_CRITERIA.md`（验收，⚠️ 复选框全未勾）。

### 3.3 长线计划轴（`plans/`，Vision 驱动，D-041 定位）

| 计划 | 内容 | 状态 |
|---|---|---|
| `PLAN-1-information-model` | 词汇对齐 + 提案层 + Cluster | A/B ✅ · C1-1 待 Phase 06 |
| `PLAN-2-light-up` | Light Up 8 步采集管线 | A/B ✅ · C2-1 未做 |
| `PLAN-3-sync-sources` | Sync 外部源（GitHub 先行） | A ✅ · B3-1 token 通/OAuth 未做 · C3-1 未做 |
| `PLAN-4-agent-detector` | Agent/Detector 智能层（真实 LLM=MiMo） | A/B ✅ · C4-1 未做 |
| `PLAN-5-chunk-interface` | Chunk 界面（语义色/密度图/配对芯片） | A/B ✅ · C5-1 未做 |
| `PLAN-6-api-mcp` | API/MCP/Provider 对外授权面 | A/B ✅ · 真机实测、Python SDK 未做 |
| `PLAN-7-shared-clusters` | Shared Cluster 四分离 + 共享权限 | A/B7-1 ✅ · B7-2/C7-1 未做 |
| `PLAN-8-meta-tags-profile` | Meta Tag 三层 + User Profile | A/B ✅ · C8-1 未做 |
| `plans/README.md` | plans 索引 + Vision↔代码词汇对照 | ⚠️ 头部"全部 PROPOSED"与表内"已执行"自相矛盾 |
| `plans/LIGHT_UP_UX_ARTISTRY.md` | Light Up UX 缺陷清单 + Agent 提示词 | ⚠️ 靶点是旧版 lightup，疑似被 D-071 重设计覆盖 |

### 3.4 专题计划

| 文档 | 范围 | 状态 |
|---|---|---|
| `UI_LAYOUT_PLAN.md` | Layout v2 双模式 L1–L7 | ✅ 已执行 |
| `LIGHT_UP_IMPLEMENTATION_PLAN.md` | Light Up Studio S1–S6 | ✅ EXECUTED |
| `INTERACTION_UX_PLAN.md` | 去表单化 P0–P5（一轮） | ✅ EXECUTED |
| `UX_OPTIMIZATION_PLAN.md` | 质感对标 P0–P2（二轮） | ✅ EXECUTED |
| `CANVAS_PLAN.md` | Overview Canvas 信息树 | ⚠️ 标 PROPOSED，实际已获批执行（D-079） |
| `BUTTON_OPTIMIZATION_PLAN.md` | ~170 按钮审计 P0–P2 | ⚠️ P0 已被 D-081 执行，头部未回写 |
| `WEB_INTELLIGENCE_IMPLEMENTATION_PLAN.md` | 采集管线 Phase 02–05 | ⚠️ M1–M3 大体达成未回写；采集中心/full-async 待做 |
| `GLOBAL_OPTIMIZATION_PLAN.md` | 商用五门槛 M1–M4 | 🔶 M1 ✅ · M2–M4 未做（O2-3 例外已做） |
| `INTEGRATION_HARDENING_PLAN.md` | MCP/API 商业化 P0/P1 | 🔶 P0 ✅ · P1 未做 |
| `BACKEND_ROADMAP.md` | 后端 spec 阶段收口 + 云端路径 | ✅ Phase 00–06 全 ✅ |
| `DIVERGENCE_PLAN.md` | 近线发散方向 D1–D7 | ⚠️ D7 DECIDED；D1/D4 被 PLAN-4、Web Intel 实质覆盖 |
| `PRODUCT_DEPENDENCY_MAP.md` | R1–R4 依赖图 | ✅ |
| `PRODUCT_ACCEPTANCE_CRITERIA.md` | T101–T402 验收 checkbox | ⚠️ 全未勾，掩盖 R1–R3 已完成 |

## 4. 模型 / 领域设计（13 份，均 ✅）

| 文档 | 一句话 |
|---|---|
| `INFORMATION_MODEL.md` | 概念权威：混合模型 + 三层 + 状态词表（§11–13 对齐 Vision） |
| `RAW_INFORMATION_TAXONOMY.md` | 4 种原始信息类型与字段 |
| `STRUCTURED_OBJECT_TAXONOMY.md` | 5 种结构化对象类型与字段 |
| `RELATIONSHIP_MODEL.md` | 5 种关系边 + 约束 + 展示规则 |
| `PROVENANCE_MODEL.md` | 溯源五态表达 |
| `DOMAIN_MODEL.md` | Chunk/Cluster/Context/MetaTag ↔ 实现实体 |
| `DATABASE_DESIGN.md` | 15 表 ER（⚠️ 缺迁移 0011_owner_scoping） |
| `API_DESIGN.md` | API 分层与稳定约定 |
| `API_CONTRACT.md` | v1 契约冻结面（D-060） |
| `SECURITY_MODEL.md` | 威胁面 + 授权模型 + 残余风险 |
| `CONTEXT_VIEWS.md` | Context Space vs Context View 边界 |
| `WEB_INTELLIGENCE_ARCHITECTURE.md` | 采集组件 + Adapter 契约 + 提取管线 |
| `COMPONENT_REGISTRY.md` | 15 个逻辑组件登记 |

## 5. UI / 交互（8 份）

| 文档 | 一句话 | 状态 |
|---|---|---|
| `MVP_UI_SPECIFICATION.md` | MVP UI 规格 S1–S7 | 🔁 §1 暗色 token 被 D-031 取代；§4–6 组件规则仍有效 |
| `MVP_USER_FLOWS.md` | 工作流 F1–F8 + 场景走查 | 🔁 "仅两视图"布局被 15 页现实取代，留档 |
| `LIGHT_UP_UX_VISION.md` | Light Up 愿景 Capture→Illuminate | ✅ |
| `LIGHT_UP_INTERACTION_SPEC.md` | Light Up 交互规格 + 状态机 | ✅ |
| `ROUTING_SYSTEM.md` | 零依赖 URL 路由（D-078） | ✅ 已实现 |
| `UI_COLORBLOCK_REFACTOR.md` | 大色块设计语言 P1–P4 | ⚠️ 状态停在 EXECUTING，完成情况无记录 |
| `INFORMATION_EXPERIENCE_OVERHAUL.md` | 信息体验重构 C/D/E/F（排版/源库/worker/摘要） | ✅ D-083，P1 待续见内 |
| `ui-prototype/index.html` | 早期静态原型（内存态） | 📜 |

## 6. 现状 / 审计（14 份）

| 文档 | 一句话 | 状态 |
|---|---|---|
| `REMAINING_WORK.md` | **全项目未完成项统一清单 + 文档漂移表** | ✅ 最新权威现状（2026-11-21） |
| `IMPLEMENTATION_STATUS.md` | 全项目实施总账 + 验证证据 | ⚠️ 头部日期 11-19、尾部"Next action=Phase 05"过期、缺 D-079…083 |
| `PRODUCTIZATION_REPORT.md` | 产品化冲刺报告（sync 真实化/IDOR/响应式） | ✅ |
| `THINKING.md` | 活跃任务 + 审批历史 | ✅（正文 Phase 05 段落停在 11-19 语境） |
| `KNOWN_ISSUES.md` | 限制与未解决问题 | ✅ |
| `BACKEND_CURRENT_STATE.md` | 后端审计 | ✅（测试数为时点值） |
| `PRODUCT_CURRENT_STATE.md` | 端到端产品盘点 | ⚠️ "无账户/搜索/分页"已被 R1/R2 推翻 |
| `PRODUCT_GAP_REGISTER.md` | 缺口 GAP-01…17 | ⚠️ GAP-01/02/03/04/05/06/07 已消解未划掉 |
| `PRODUCT_COMPLETENESS_AUDIT.md` | 四维完整性审计 | ⚠️ "找回/演化/注册 ❌"已被推翻 |
| `USER_JOURNEY_SIMULATION.md` | 用户旅程模拟 | ⚠️ Stage 1/2 断点已修复 |
| `EVAL_PLAN_EXECUTION.md` | 商业 Eval Round 2（4.3/5）+ 发行门禁 | 🔶 门禁 G2/G3 已关闭未回写 |
| `WEB_INTELLIGENCE_CURRENT_STATE.md` | 采集侧缺口调查 | ⚠️ "无 worker"已被异步 worker 推翻 |
| `LIGHT_UP_CURRENT_STATE.md` | 旧版 lightup 审计 | 🔁 被 LightUpStudio 重写取代，留档 |
| `THYLAS_REFERENCE.md` | Thylas 参考项目审计 | 📜 |

## 7. 决策 / 规则（4 份）

| 文档 | 一句话 | 状态 |
|---|---|---|
| `DECISION_LOG.md` | D-001…D-083 全记录 | ⚠️ D-079/080 标题挂 PROPOSED，正文已 DECIDED/已执行 |
| `DESIGN_BOUNDARIES.md` | 范围 / 非目标 / 归属 | ✅ 含 11-20 两次修订 |
| `AGENTS.md` | 开发者/Agent 强制规则 | ⚠️ §8 "Phase 00 documentation-only" 已过期 |
| `PRODUCT_ACCEPTANCE_CRITERIA.md` | 见 §3.2 | — |

## 8. 矛盾清单（文档间说法不一致，需回写裁决）

| # | 矛盾 | 以谁为准 |
|---|---|---|
| 1 | PLAN-8 状态：`README.md:5`+`DEVELOPMENT_ROADMAP.md:23` 说 in progress ↔ `plans/PLAN-8:3` 说 A/B EXECUTED | PLAN-8 |
| 2 | Phase 05 状态：`DEVELOPMENT_ROADMAP.md:14` IN PROGRESS ↔ `IMPLEMENTATION_STATUS.md:14` IMPLEMENTED | IMPLEMENTATION_STATUS |
| 3 | "Next action=Phase 05 场景" ↔ 同文件 :15 说评估已改名 Phase 06 | Phase 06 编号（D-030） |
| 4 | `IMPLEMENTATION_STATUS.md:3` 日期 11-19 ↔ 正文写到 11-21 | 正文 |
| 5 | "无账户/搜索/分页"（`PRODUCT_CURRENT_STATE.md:7`）↔ R1/R2 已交付（`REMAINING_WORK.md:6-8`） | REMAINING_WORK |
| 6 | GAP-01…07 开放（`PRODUCT_GAP_REGISTER.md`）↔ 已修复（`REMAINING_WORK.md:67`） | REMAINING_WORK |
| 7 | D-079 标题 PROPOSED ↔ 同条 :635 DECIDED（`DECISION_LOG.md:618/635`） | :635 |
| 8 | Canvas 待批准（`CANVAS_PLAN.md:3`）↔ 已执行（`REMAINING_WORK.md:8`） | 已执行 |
| 9 | 按钮优化待批（`BUTTON_OPTIMIZATION_PLAN.md:3`）↔ P0 已由 D-081 执行 | 已执行 |
| 10 | plans 全 PROPOSED（`plans/README.md:3`）↔ 表内标已执行（:25/:32） | 表内 |
| 11 | 暗色 token（`MVP_UI_SPECIFICATION.md:9-22`）↔ 浅色 shell | D-031 已裁决，留档 |
| 12 | "仅两视图"（`MVP_USER_FLOWS.md:22`）↔ 15 页应用 | 现实代码 |
| 13 | 测试数 80/71/93/120 四处漂移 | 120（THINKING.md:5） |
| 14 | `AGENTS.md:83` "Phase 00 documentation-only" ↔ 大量已交付实现 | 现实代码 |
| 15 | `KNOWN_ISSUES.md:148` "npm test 起不来" ↔ vitest 120 全绿 | 环境差异，均属实 |

## 9. 建议清理动作（待批准后执行）

**P0 — 状态回写（只改状态行，不动内容）**
1. `README.md`：PLAN-8 已执行、Setup 段、目录树补 plans/ 与新文档。
2. `DEVELOPMENT_ROADMAP.md`：Phase 05 → COMPLETE、PLAN-8 → A/B 执行完毕。
3. `IMPLEMENTATION_STATUS.md`：头部日期、尾部 Next action、补 D-079…083。
4. `DECISION_LOG.md`：D-079/080 标题 PROPOSED → DECIDED/EXECUTED。
5. `plans/README.md`：头部状态描述与表内对齐。
6. `AGENTS.md` §8：现状提醒改为"改动前先看 REMAINING_WORK"。

**P1 — 过期审计件处理**（在文件头部加一行"⚠️ 结论已被 X 取代"，不删内容）
`PRODUCT_CURRENT_STATE` / `PRODUCT_GAP_REGISTER`（划掉已消解 GAP）/ `PRODUCT_COMPLETENESS_AUDIT` / `USER_JOURNEY_SIMULATION` / `CANVAS_PLAN` / `BUTTON_OPTIMIZATION_PLAN` / `WEB_INTELLIGENCE_IMPLEMENTATION_PLAN`。

**P2 — 被取代件归档**（移入 `archive/` 或加 superseded 头）
`MVP_UI_SPECIFICATION` §1 / `MVP_USER_FLOWS` / `LIGHT_UP_CURRENT_STATE` / `plans/LIGHT_UP_UX_ARTISTRY`（先确认 D-071 覆盖范围）。
