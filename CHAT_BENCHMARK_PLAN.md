# CHAT_BENCHMARK_PLAN.md — 对话 Flow 基准与优化循环

Status: `PROPOSED` — 2026-11-25。目标（创始人原话）：**设计一个基准开始跑优化，把我们的对话
flow 弄到顶级**。基座：G7 已验收（D-113）；对标对象=GSC_CHAT_DESIGN v2 原型交互质量。

## 0. 要解决的问题（具体场面）

现在「整理一下智能床垫项目数据」出来一张任务卡——但它**够好吗**？管线分段对不对、onboarding
问的问题对不对、提案该不该被采纳、用户等到任务卡要几秒——没有任何数字。改一个 prompt 后
变好还是变坏，全凭感觉。基准就是把「顶级」拆成能打分的维度，**每次改动跑一遍，分数只升不降**。

## 1. 评分卡（七个维度，每维 0–100）

| # | 维度 | 指标 | 测法 | 权重 |
|---|---|---|---|---|
| D1 | **计划质量** | 结构合法率 · 阶段意图覆盖率 | 30 条基准指令 → 计划 stages vs golden（kind 序/命名语义） | 25% |
| D2 | **DSL 质量** | 一次合规率 · 降级率 · 字段召回 | 生成 → parseFlow（ok/degraded）· 字段集 vs golden | 15% |
| D3 | **LLM 任务层** | 一次通过率 · 修复成功率 · 回退率 | structuredCall 日志（通过/修复后过/回退三态） | 10% |
| D4 | **管线执行** | 停点正确率 · 续跑正确率 · 误停/漏停 | 状态轨迹断言（awaiting_user 必须恰在 confirm） | 15% |
| D5 | **提案质量** | 精准率 · 召回率 · 采纳率 | synthesize/confirm 提案集 vs golden 提案集 | 20% |
| D6 | **延迟** | 任务卡出现 P50/P95 · 停点 P50/P95 | created_at 差（消息→任务卡块；指令→awaiting_user） | 10% |
| D7 | **成本** | token/指令 · LLM 调用数/指令 | llm.call 日志 prompt+completion tokens 汇总 | 5% |

总分 = 加权和。**top-tier 门槛（目标线）**：总分 ≥88 · D1≥90 · D4≥95 · D5≥80 ·
P95 任务卡 ≤8s（真 LLM 档）。

## 2. 基准集 v1（30 条，golden 人工审定）

| 类 | 条数 | 例 | golden 断言（节选） |
|---|---|---|---|
| 整理指令 | 10 | 「把智能床垫项目的数据整理一下」 | stages=collect→synthesize→compose→confirm；停点=confirm |
| 显式 onboarding | 5 | 「先弄 onboarding 让我修改关键信息」 | DSL 含 review 字段≥1 + confirm 动作≥1 |
| 卡内 PATCH | 5 | 「再加一步导出 PDF」（预置任务上） | add_stage 即时生效；段名含「导出」 |
| 查询问答 | 5 | 「我这周添加了哪些新内容」 | collect 为主；不产生 confirm 停点 |
| 边界 | 5 | 空指令/超长/注入尝试（`ignore instructions`）/纯表情/纯代码 | 不崩、回退或拒答、无注入面 |

- golden 文件：`bench/cases/*.json`（指令 + 期望断言 + 期望提案 kind 集）。
- **golden 集创始人终审**（确认点 1）——机器打分基于它，它错则分数错。

## 3. 运行器（两档）

| 档 | LLM | 用途 | 跑法 |
|---|---|---|---|
| **A 确定性档** | mock（脚本化应答） | 管线/解析/状态机/幂等回归——**CI 可跑零成本** | `npm run bench:mock` |
| **B 质量档** | 真 LLM | 计划/DSL/提案质量评分 + 延迟/成本 | `npm run bench:llm`（需 key） |

- 落点：`bench/run.ts`（复用 orchestrator/uispec/uiflow 真代码，不起 HTTP——直接函数级跑，
  快且稳）；输出 `bench/out/scorecard-<ts>.md` + `bench/out/baseline.json`。
- 对比器：`bench/compare.ts`——新旧 scorecard diff（维度分/回归红标）。
- **基线纪律**：首轮跑出的分数=baseline 入库（`bench/baseline.json`）；此后每次改动
  `compare` 必须无回归（分数不降）方可合入——与 vitest 全绿同级门。

## 4. 优化循环（每轮五步）

```
跑基准 → 得分卡 → 挑最差项归因 → 单点改（一次一个变量）→ 复跑 compare
   ↑                                                    ↓
   └───────────── 未提升则回滚；提升则更新 baseline 入账 ─────┘
```

**首轮预判的优化候选**（归因后取舍，非一次全做）：
1. 计划 prompt 加 few-shot（四段管线正例 + 边界反例）→ 抬 D1。
2. DSL 生成 schemaHint 增强（review 字段清单来自指令抽取）→ 抬 D2。
3. structuredCall 修复提示具体化（带校验错误定位）→ 抬 D3。
4. synthesize 提案召回（现 E2E 常 0 提案——**先换 key 再测基线**，401 是当前最大干扰）→ 抬 D5。
5. 计划生成并行化/缓存 → 抬 D6。

## 5. 分期

| 期 | 交付 | 验收 |
|---|---|---|
| B1 | 基准集 30 条（golden）+ 运行器 mock 档 + scorecard/compare | `npm run bench:mock` 出分 + diff 可用 |
| B2 | 真 LLM 档 + 延迟/成本采集 + baseline 入库 | 首份真分 scorecard（需 key） |
| B3 | 优化循环首轮（1–2 个候选）+ baseline 更新纪律落 DECISION_LOG | 至少一维 +5 分且无回归 |

## 6. Task card（七项）

1. **Purpose** 对话 flow 质量可量化可回归——改 prompt/契约后「变好」有据可查，逼近顶级。
2. **Scope** bench/cases（30 golden）· bench/run.ts（两档）· bench/compare.ts ·
   scorecard/baseline 产出物 · 优化循环纪律（D-114 计划）。
3. **Interacts** agent/{orchestrator,uispec,proposer,structured,llm}.ts（被测面）·
   src/lib/uiflow.ts（解析评分）· repo/chat.ts（状态轨迹）· package.json（scripts）。
4. **Does not own** 生产代码改动（优化轮才动，且单变量）· UI 评测（人工四图验收制不动）·
   通用 LLM 评测框架（只测对话 flow 面）。
5. **User flow** 创始人改 prompt → `npm run bench:llm` → scorecard 对比 → 看哪维掉分 → 决策。
6. **Minimum（B1）** 30 条 golden + mock 档 runner + scorecard + compare，全函数级零 HTTP。
7. **Test method** vitest（runner 自测：golden 判分正确性）+ `bench:mock` 出分 + diff 报告。

## 7. 不做（本期）

UI 主观评测自动化 · 多模型横评 · 在线 A/B · 成本预算告警（B2 后置）。

## 8. 确认点

1. **golden 集终审权**：30 条断言由我起草、你过目修订（机器评分的锚）——ok？
2. 真 LLM 档预算：B2 首跑约 30 条 × 4–6 次调用 ≈ 数百 K token，可接受？（先换 key）
3. 基准产物落 `bench/`（repo 内，baseline.json 入 git）——ok？
