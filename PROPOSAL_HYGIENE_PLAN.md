# PROPOSAL_HYGIENE_PLAN.md — P1 提案面治理（Next Step）执行计划

Status: `PROPOSED` — 待确认开工。2026-11-23。
依据：M5 发现的 P1（`PHASE_07_M5_结论.md` §4）· **根因已定位**（见 §0）。
并行线状态：D-096 已拍部署形态/错误格式/SLO 数字（99.5%/读 p95≤500ms/写 p95≤800ms，可改）；
仅 U2 collections 合并仍悬（归优化线，不进本计划）。

## 0. 根因（已坐实，不是猜测）

1. **detector 重复产案 bug**：`detector.ts` 建去重集用 `${p.kind}:${p.target_id}:${p.related_id}`
   （metadata 提案 related_id=null → 键 `metadata:id:null`），判定时却用 `metadata:${id}:`（空串）——
   **键错配 → 去重永不命中**，每次 runDetection（每条采集后都跑）为每个无 source_label 条目
   再产一条「missing source_label」→ pending 149→459+ 的洪峰主源。
2. **管线命名粒度**：`processCaptureTask` 对每个 chunk 建议各产 1 条 semantic_name + 1 条
   classification → 单目标最高 12 条。
3. **采集无自动重试**：`capture_tasks.retry_count` 字段存在但无人读——失败任务（arXiv 2/10 abort）
   要手动补采。

## 1. Task card（七项）

1. **Purpose** 提案面从噪声变信号：pending 不再指数涨、UI 可审、采集自愈。
2. **Scope** detector 去重修复+限流 · 管线命名聚合 · 采集自动重试 · UI 按目标折叠 · 存量去重收尾 ·
   治理对账脚本。
3. **Interacts** `server/agent/detector.ts` · `server/intel/pipeline.ts` · `server/repo/tasks.ts` +
   `server/intel/pipeline.ts` worker · `src/views/detail.tsx`/`spatial.tsx` ·
   `scripts/dedupe-proposals.mjs`（新）· `scripts/verify-proposal-hygiene.mjs`（新）。
4. **Does not own** 批量裁决 UI（后置）· 提案 deferred 状态 · 语义检索/RAG · 优化线 U2/批次。
5. **User flow** 打开详情：原来 12 行紫卡 → 变「重命名 · 3 条 [展开]」「元数据 · 1 条」折叠组，
   展开后逐条三键裁决；空间视图每目标一张提案卡带计数徽标；采集失败的任务几分钟后自愈，
   无需手动补采。
6. **Minimum** A+B+C（增量治理）+ D（折叠）+ E（对账）。
7. **Test method** vitest：detector 连跑两遍增量=0（回归测试锁死键错配）；管线聚合断言；
   任务重试（失败→退避→重跑→completed）；对账脚本输出 pending 构成与水位曲线。

## 2. 技术路径（分层）

### A. detector 去重修复 + 限流（server/agent/detector.ts）
- 统一键格式 `relKey(kind, target, related) = kind:target:related??''`（建集与判定同一函数）；
  现有 dedupe/association 反向键一并统一。
- metadata 限流：同 target 已有 pending metadata 提案即跳过（修键后天然成立）；
  另加**同类上限 3**：同 target 同 kind 的 pending ≥3 不再产（防其它来源堆积）。
- 回归测试：两次 runDetection 之间 metadata/dedupe/association 增量必须=0。

### B. 管线命名聚合（server/intel/pipeline.ts）
- `suggestForChunks` 的多 chunk 建议聚合为**每目标** 1 条 semantic_name（取首个非空
  semantic_name，rationale 汇总各 chunk）+ 1 条 classification（取首个非空）。
- 一目标 12 条 → 2 条；裁决负担降 6 倍。

### C. 采集自动重试（server/intel/pipeline.ts worker + repo/tasks.ts）
- 失败且 retryable（fetch abort/failed）→ `retry_count < 3` 时退避重排（60s×2^n，更新
  next_run_at 或直接置 pending 延迟认领）；耗尽置 failed 终态。
- 零 schema 改动（retry_count 已在）；worker 现有 reclaimStale 循环里加一段即可。
- 注入故障测试：fetchImpl 第一次抛 abort → 重试后成功 → task completed。

### D. UI 提案按目标折叠（detail.tsx + spatial.tsx）
- detail：按 `kind` 分组折叠行（「重命名 · 3 条」chevron 展开三键裁决），空态不变；
  归因条「N 条提案待确认」保持总数。
- spatial：每目标一张 spatProp 卡（kind 徽标 + 最新值 + 计数「+N」点开小列表），
  高度可控不再挤爆；三键保留在卡上（对最新一条）+ 展开后逐条。
- 零新 API（数据已在 listProposals）。

### E. 存量清理 + 治理对账
- `scripts/dedupe-proposals.mjs`：同 kind+target+proposed_value 的 pending 只留最早一条，
  其余 resolve 为 rejected（rationale 标 `auto-dedupe`）——**只动重复副本，不动唯一提案**。
- `scripts/verify-proposal-hygiene.mjs`：输出 pending 构成（按 kind/source）、单目标最大堆叠、
  水位曲线（治理前后）；断言：单目标同 kind pending ≤3、无 identical 重复。

## 3. 验收门

| 项 | 口径 |
|---|---|
| 增量归零 | detector 连跑 2 遍，新增提案=0（vitest 锁死） |
| 采集自愈 | 10 URL 场景含 1 次注入失败 → 10/10 自动完成，0 手动 |
| 聚合 | 新采集目标命名+分类提案 ≤2 条/目标 |
| UI | 折叠前后截图；detail 12 行→3 组 |
| 水位 | 治理后 pending 回落且不单调涨；verify-proposal-hygiene 全 PASS |
| 回归 | tsc=0 lint=0 vitest 全绿（167+新） |

## 4. 不做（本期）

批量裁决 UI · 提案 deferred 状态 · 语义检索 · 优化线批次/U2 · 性能调优。

## 5. 确认点

1. **存量清理**：重复提案只留最早、其余标 rejected（`auto-dedupe` 注记）——同意？
   （备选：存量不动只治增量，旧洪峰靠人工慢慢清）
2. **同类上限 = 3**（同 target 同 kind pending 上限）——同意？
3. **批量裁决 UI**（多选采纳/拒绝）本期要不要？（推荐后置，等折叠版用一阵）
