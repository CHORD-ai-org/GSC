# CHAT_BENCH_EXEC_PLAN.md — 对话 Flow 基准·执行计划

Status: `PROPOSED` — 2026-11-25。蓝本：`CHAT_BENCHMARK_PLAN.md`（三确认点默认：golden 我起草
你终审 · B2 数百 K token 可接受 · 产物落 bench/ 入 git）。任务卡七项见蓝本 §6。

## 0. 目标（跑通即验收）

`npm run bench:mock` 30 条出评分卡 → `npm run bench:compare` 对比 baseline 零回归 →
真 LLM 档首份基线（换 key 后）→ 优化首轮至少一维 +5 分且无回归。

## 1. 步骤（六步三阶段）

### Step 1 · 基准集 golden（30 条）
- `bench/types.ts`：Case 契约——`{id, class, instruction, pre?, expect}`；expect 断言：
  `stages`（kind 序）· `stop_at`（confirm|null）· `dsl`（review_fields/confirm_actions 子集）·
  `proposals`（kind 集）· `no_crash`（边界类）。
- `bench/cases.json`：整理 10 / 显式 onboarding 5 / 卡内 PATCH 5 / 查询 5 / 边界 5
  （空指令/超长/注入尝试/纯表情/纯代码）。
- **交付即送你终审**（golden=机器评分锚）。
**验**：`npm run bench:cases`（schema 校验：30 条、类分布、断言非空）。

### Step 2 · 运行器 mock 档（bench/run.ts）
- 函数级直跑真代码（orchestrator/uispec/uiflow/repo），每案独立 PGlite（migrationSql）；
  mock LLM 按类路由确定性应答（计划/DSL/建议脚本化）。
- 判分：D1 计划结构 vs golden · D2 parseFlow 合规/降级/字段 · D3 脚本化三态（过/修复过/回退）
  · D4 状态轨迹（停点必在 confirm、续跑正确）· D5 提案 kind 集 vs golden；
  **D6/D7 mock 不计分**（延迟/成本无意义），权重按剩余五维归一。
- 产出：`bench/out/scorecard-mock-<ts>.md` + `bench/out/baseline.json`（首轮=基线）。
**验**：`npm run bench:mock` 出分；人为改坏一个 expect 能掉分（判分自检 vitest）。

### Step 3 · 对比器（bench/compare.ts）
- `npm run bench:compare -- <old.json> <new.json>`：逐维 delta + **回归红标**（任一维 ↓>0 即红）
  + 结论行（PASS/REGRESSION）。
- 自测：构造回归样例断言红标正确。
**验**：vitest（compare 判定）+ 真实两份 scorecard diff 可读。

### Step 4 · 真 LLM 档（B2，换 key 后）
- `bench/run.ts --llm`：同 runner 换真 chatComplete；采集 每案耗时（指令→awaiting_user/完成）
  + LLM 调用数 + tokens（llm.ts LlmResult 有 usage 则聚合，无则只记调用数——如实）。
- 七维全计分（D6/D7 计入）；产出 `scorecard-llm-<ts>.md`，首份即 `baseline-llm.json`。
**验**：首份真分 scorecard（前置：**换 401 key**）。

### Step 5 · 优化循环首轮（B3）
- 归因最差 1–2 维 → **单点改**（候选：① 计划 prompt few-shot→D1 ② DSL schemaHint 抽取
  review 字段→D2 ③ 修复提示带错误定位→D3）→ 复跑 compare → 提升则更新 baseline，否则回滚。
**验**：至少一维 +5 且零回归（或如实「未提升已回滚」）。

### Step 6 · 纪律落账
- DECISION_LOG **D-114**：baseline 纪律——动 agent/ 或 uiflow 判分面的改动必须跑
  `bench:mock` + compare 不降（与 vitest 同级门）。
- `bench/README.md` 一页用法 + IMPLEMENTATION_STATUS/THINKING 同步。
**验**：三处文档一致。

## 2. 验收门

| 门 | 口径 |
|---|---|
| 基准集 | 30 条 schema 过 + 创始人终审记录 |
| 判分 | 判分自检（改坏 expect 必掉分） |
| 对比 | 回归红标正确（构造样例） |
| 基线 | mock 基线入 git；llm 基线（key 后） |
| 优化 | 一维 +5 零回归 或 如实回滚 |
| 回归 | tsc=0 lint=0 vitest 全绿 |

## 3. 不做（本期）

UI 主观评测自动化 · 多模型横评 · A/B · 成本告警。

## 4. 残余确认点

1. Step 1 交付 golden 后我暂停等你终审（评分锚，不审不跑 B2）——ok？
2. compare 回归判定=任一维 ↓ 即红（哪怕 -0.5）；要不要留 1 分容差，你定。
