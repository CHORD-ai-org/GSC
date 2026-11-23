# PHASE_07_M5_结论.md — 场景闭环（M5）执行结论

日期：2026-11-23 · 执行：Agent（裁决动作由 agent 代执行、API 真实调用，如实记账）
依据：`PHASE_07_V5_PLAN.md` · 状态：**Phase 07 COMPLETE**

## 1. 双场景时间线

### 场景 A（20+ 文档材料）
| 步 | 动作 | 结果 | 证据 |
|---|---|---|---|
| 1 | 生成 20 份雨课堂/邮件材料 → file source 批量入料 | 20/20 入库（重复 sync `skipped:1` 幂等验证） | m5-b1-ingest.png（列表同框） |
| 2-3 | 空间摆位 → 矩形圈定 | 20 张卡光晕 + 上下文条 | v4-spatial.png（同构） |
| 4-5 | 提交给 Agent（真 LLM，mimo） | +40 提案卡（20 项 × 命名+分类）落回 | m5-a5-delegate.png |
| 6 | 裁决：采纳 2 · 拒绝 2 · 暂缓 1 | 暂缓项保持 pending ✓ | API 写账本 |
| 7 | 详情归因/溯源 | 归因条 + title 紫点 + `via proposal` 紫迹 | m5-a7-attribution.png |
| 8 | 归因对账 | **4/4 PASS** | verify-attribution 输出 |

### 场景 B（10 条 URL）
| 步 | 动作 | 结果 | 证据 |
|---|---|---|---|
| 1 | 10 条 arXiv URL 采集 | 首跑 8/10（2 超时 abort）→ 重试后 **10/10 入库** | m5-b1-ingest.png |
| 2-5 | 圈定 → 委派 | +40 提案卡 | m5-b5-delegate.png |
| 6 | 裁决：采纳 1 · 拒绝 1 | | API 写账本 |
| 7-8 | 归因对账 | **3/3 PASS**（含 web 条目零编辑基线） | verify-attribution 输出 |

**总裁决账本**：采纳 3（rename，全带 `via proposal` 紫迹）· 拒绝 3（零编辑）· 暂缓 1（pending 保持）。

## 2. 归因对账表（7/7 PASS）

| 条目 | 预期 | 实际 | 判定 |
|---|---|---|---|
| A 雨课堂注意力机制（采） | user 0 / agent 1 / title=agent | 一致 | PASS |
| A 导师周会（采） | user 0 / agent 1 / title=agent | 一致 | PASS |
| A GPU维护（拒） | 0/0 无编辑 | 一致 | PASS |
| A 读书会（拒） | 0/0 无编辑 | 一致 | PASS |
| B Transformer笔记（采） | user 0 / agent 1 / title=agent | 一致 | PASS |
| B BERT笔记（拒） | 0/0 无编辑 | 一致 | PASS |
| B web 条目（未裁决） | 0/0 基线 | 一致 | PASS |

零副本断言：**ZERO-COPY PASS**（12 次视图切换 0 背景写）。

## 3. 写账本（显式写逐笔）

| 写 | 笔数 | 性质 |
|---|---|---|
| 入料（file source ×20 + sync；capture ×12 含 2 重试） | 32 | 显式导入 |
| 委派提案（2 轮 UI 委派，LLM 产出 → createProposal） | 80 | 显式提交（点「提交给 Agent」） |
| 裁决（accept 3 / reject 3） | 6 | 显式裁决 |
| 除此之外的后台写 | **0** | 探针实证 |

（管线自身产物如实单列：capture 生成 10 web 条目 + 管线自动命名/检测提案若干——属导入语义，不算用户写。）

## 4. 发现的问题（分级）

**记录后修（P1）**
1. **提案堆积**：detector 批量产「missing source_label」元数据提案 + 采集管线按 chunk 产命名提案（单目标最高 12 条），pending 从 149 涨到 459+。空间/详情提案面需要按目标折叠 + detector 限流。
2. **采集无自动重试**：arXiv 2/10 fetch abort（retryable 标记在）但要手动补采——应加队列级重试。
3. **管线命名提案粒度**：一目标 12 条 semantic_name（每 chunk 一条）语义不当，应聚合或改 kind。

**不修（记录）**
- 提案无 deferred 状态（暂缓=本地收起，by design）。
- 分类提案接受仅落定不自动改类（review-marked only，by contract）。

## 5. 三感觉落点核对（对照创始人决策）

| 感觉 | 落点 | 证据 |
|---|---|---|
| Ream（互知：参与痕迹在工作对象上） | V1 双色活动条/足迹 + V3 归因条/字段圆点/via proposal | m5-a7-attribution.png |
| Huabu（空间工作台：圈定即上下文边界） | V4 摆位/圈选/委派/提案落回 | v4-spatial.png / m5-a5-delegate.png |
| CLEO（多投影归因） | V2 五投影（零副本实证）+ V3 编辑级归因 | v2-relations/timeline.png + 对账表 |

## 6. Phase 07 完成判定

- M1 痕迹层 ✓（D-089）· M2 多投影 ✓（D-090）· M3 归因与提案面 ✓（D-091）· M4 空间工作台 ✓（D-092）· M5 场景闭环 ✓（D-093）
- 全程验证基线：tsc=0 · lint=0 · vitest 167/167 · 零副本探针 PASS · 归因对账 7/7 PASS。
- **Phase 07 COMPLETE（2026-11-23）**。
