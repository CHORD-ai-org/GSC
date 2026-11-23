# PHASE_07_V5_PLAN.md — 场景闭环（M5）执行计划

Status: `PROPOSED` — 待确认开工。2026-11-23。
依据：`PHASE_07_PLAN.md` §七 · 场景 A/B（creator-pov 求真闭环）·
`docs/research/malleable-context-space/figs/fig-v5-loop.png`。V1–V4 已完成（D-089..092）。
M5 是**验证性里程碑**：不加新功能，只跑通闭环、留证、下结论。

## 0. 目标（具体场面）

按场景 A（20+ 文档材料）与场景 B（10 条 URL）各跑一遍完整闭环：
**入料 → 对象 → 空间圈定 → 委派 → 提案卡落回 → 采纳/拒绝 → 详情归因/溯源**。
每步留截图证据；结束跑**归因对账**（computeAttribution 与实际操作台账一致）与
**零副本断言**（探针全程 0 写之外的显式写动作逐笔可数）；产出结论文档并宣布
Phase 07 M5 完成。

## 1. Task card（七项）

1. **Purpose** 用真实使用路径验证四个里程碑拼起来是否成立（creator-pov 求真），找出断点。
2. **Scope** 场景 A/B 执行手册 + 数据准备 · 归因对账脚本 · 零副本断言 · 证据留存 ·
   结论文档（含发现的问题清单）· Phase 07 收官记录。
3. **Interacts** 全链路只读消费：sources sync / capture / spatial / proposals / detail
   attribution；新增仅 `scripts/verify-attribution.mjs` + `docs/research/malleable-context-space/PHASE_07_M5_结论.md`。
4. **Does not own** 自动化测试基础设施大改 · 任何新功能/UI · 性能优化（发现即记录不修）。
5. **User flow（执行者视角）** 场景 A：批量入料 20+ 材料 → 列表/空间看全貌 → 圈定 6-8 张
   → 提交给 Agent → 提案卡逐张裁决（采纳 2/拒绝 2/暂缓 1）→ 打开被采纳项看归因条与
   via proposal 紫迹 → 脚本对账。场景 B：10 条 URL 采集 → 同一闭环 → 对账。
6. **Minimum** 双场景各跑通一遍（可脚本化处脚本化）+ 归因对账 + 零副本断言 + 结论文档。
7. **Test method** `node scripts/verify-attribution.mjs <ledger.json>` 输出 PASS/FAIL 对账表；
   probe-views 零副本；每场景 ≥6 张步骤截图；结论文档含两场景时间线与发现。

## 2. 技术路径（分层）

### A. 数据准备（两场景入料通道，只用既有能力）
- **场景 A（文档）**：生成 20 份雨课堂/邮件风格模拟材料（.txt，本地 `data/v5-scenario-a/`）
  → 建 file source（scope=body）→ `POST /api/sources/:id/sync` 批量入料。
  备选：材料不足时用 Light Up 手动流补齐到 20。
- **场景 B（URL）**：10 条真实 URL → `POST /api/capture` 建任务 → 轮询至 imported。
  ⚠️ 风险：沙箱 DNS 昨日不稳（ENOTFOUND）——若不可用，降级为本地 HTTP fixture
  （静态服务喂 10 篇 HTML）并**如实记录降级**，不假装跑过真实 URL。

### B. 闭环执行手册（两场景同构，逐步留证）
每场景固定 8 步，每步截屏 `ui-prototype/shots/m5-a1.png`…：
1. 入料完成列表全景 → 2. 空间视图摆位 → 3. 圈定（上下文条）→ 4. 提交给 Agent
→ 5. 提案卡落回 → 6. 裁决（采纳 2/拒绝 2/暂缓 1，人肉点击）→ 7. 被采纳项详情
（归因条 + via proposal 紫迹 + 溯源链）→ 8. 归因对账脚本输出。
脚本化可及处（截图脚本/数据准备）用 `scripts/shot-*.mjs` 既有骨架；裁决必须人肉点击
（这是求真场景，不许脚本代打）。

### C. 归因对账脚本（`scripts/verify-attribution.mjs`）
- 输入 `ledger.json`：`[{ item_id, expect: { user_edits, agent_edits, field_owners } }]`。
- 逐项拉 `GET /api/items/:id`，比对 `attribution` 与 events 明细（含 `via proposal` 标注
  的 agent 编辑）；输出对账表（预期/实际/判定），任一不符 exit 1。
- 对账口径：接受的重命名提案 → agent_edits+1 且 events 有 `| via proposal`；
  人手 PATCH → user_edits+1；拒绝/暂缓不产生编辑事件。

### D. 零副本断言（复用）
- `probe-views.mjs` 全视图切换 + `probe-bars.mjs` 列表证据照跑；
- 场景中**显式写动作**（入料/裁决/摆位钉住）逐笔记入结论文档的「写账本」——
  求真的标准不是零写，是**写得有账**（委派之外无后台写）。

### E. 结论与收官
- `PHASE_07_M5_结论.md`：两场景时间线 + 步骤证据索引 + 归因对账表 + 写账本 +
  发现的问题（分：当场修 / 记录后修 / 不修）+ 对照 CLEO/Huabu/Ream 三感觉的落点核对。
- 收官：DECISION_LOG（D-093）· IMPLEMENTATION_STATUS（Phase 07 COMPLETE）· THINKING ·
  「待完善列表」同步。

## 3. 验收门（M5 = Phase 07 完成门）

| 项 | 口径 |
|---|---|
| 双场景 | A/B 各 8 步全通过（B 允许降级但须如实记录） |
| 归因对账 | verify-attribution 输出全 PASS |
| 零副本/写账本 | 探针 0 背景写；显式写逐笔可数 |
| 证据 | ≥12 张步骤截图 + 结论文档 |
| 收官 | D-093 + 状态/THINKING/待完善列表 同步 |

## 4. 不做（本期）

新功能 · UI 改动 · 自动化测试框架改造 · 性能修复（只记录）· 录屏（截图足够，视频可选）。

## 5. 确认点

1. **场景 A 材料**：自动生成 20 份雨课堂/邮件风格模拟材料立即可跑（默认）——还是你提供真实材料？
2. **场景 B URL**：真实 URL（需外网；DNS 不稳则降级本地 fixture 如实记录）（默认）——还是纯本地 fixture？
3. **证据形态**：逐步截图（默认，≥12 张）——还是需要录屏？
