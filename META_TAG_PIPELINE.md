# META_TAG_PIPELINE.md — Meta-tag 识别管线设计

Status: `DECIDED` — 2026-11-26 创始人确认；M1/M2/M3 已落地（见 IMPLEMENTATION_STATUS），M4 待 G6 B 批。背景：G5 闭环有「定义→建议→确认→打标→筛选」的**接收端**，
但**识别端不成体系**——建议器只被 G7 对话整理调用，采集不触发，detect 轮缺维度，新标签无发现端。
本设计补识别端；不改提案制红线（机器只建议、人确认才落，§13/D-042）。

## 1. 数据流总览

```
触发A：POST /api/agent/detect（手动全量体检）
触发B：ingest/batch 收尾钩子（仅新增条目，可关）
        │
        ▼
   runDetection 五维轮（现有三维 + 新两维）
   ├─ dedupe            （已有，文本相似）
   ├─ association       （已有，0.4≤score<阈值）
   ├─ metadata          （已有，规则+LLM）
   ├─ meta_tag 建议     （新：suggestMetaTags × 未打标条目 × 已有定义）
   └─ tag discovery     （新：新标签发现 → pending_definition 提案）
        │  全部走既有幂等（relKey 去重 + per-target cap=3）
        ▼
   proposals（pending）→ 人裁决 → 落库
```

## 2. 维度设计

### 2.1 meta_tag 建议维（接入已有建议器）
- 输入：**未打标条目**（过滤已有 tag_values 的 item×definition 组合）× `tag_definitions` 全表。
- 调用：`suggestMetaTags(config, items, definitions, fetchImpl)`——现成签名不动。
- 幂等键：`meta_tag:<item>:<definition>`；每 item cap=3（复用 pendingCount 机制）。
- `new:<name>` 回复 → 丢弃（归 discovery 维处理，避免两处产 pending_definition）。
- LLM 401 降级：该维静默跳过并在 report 记 `meta_tag: 0 (llm_unavailable)`——**不阻塞其它四维**（规则维纯本地）。

### 2.2 tag discovery 维（新标签发现端，补 D-106 的缺失触发器）
两步，v1 先规则后 LLM：
1. **候选生成（规则，零依赖）**：扫描未命中任何 definition 的条目文本 → 高频名词短语
   （分词 ≥2 次、出现在 ≥N 条、非停用词）→ 候选标签名集合。
2. **候选命名与归并（LLM，key 恢复后生效）**：候选集 → LLM 合并同义/起规范名（≤20 字）→
   每个规范名产 **1 条 pending_definition 提案**（附「命中 N 条」证据作 rationale）。
- 幂等键：`pending_definition:<规范名小写>`——同名永不重复提案（含跨轮）。
- 人裁决 accept → 走 D-106 既有流（建 definition + `new:` 打标提案转正）。

### 2.3 四轴归轴维（G6 锚点层的机器建议，v1 人工钉）
- 同 meta_tag 维同构：目标 group=`axis`（info/trajectory/vision/position 四定义），
  建议器输出 → `meta_tag` 提案（related_definition_id=轴定义 id）。
- v1 门槛：**只在显式指令后建议**（对话「把这个记到 trajectory」），不做自动归轴——
  G6 口径已定（trajectory=events 直读，机器归纳留 benchmark 后）。

## 3. 触发策略

| 触发 | 范围 | 幂等保障 | 开关 |
|---|---|---|---|
| A 手动 detect | 全库五维 | relKey+cap（已有） | 常开 |
| B ingest 钩子 | **仅本次新增 items** | 同上 + 入库时记录 processed 标记（复用 idempotency_keys） | 默认开，`GSC_DETECT_ON_INGEST=0` 关 |
| C 对话整理（已有） | 对话圈定条目 | cap（已有） | 常开 |

- 钩子实现：`ingest/batch` 返回前 `void runDetection(db, { incremental: newIds })`（不阻塞响应，
  与 G7 startTask 同步执行策略独立）；LLM 维走同样的 401 降级。
- 频率保护：同一 item 24h 内不重复跑 LLM 维（idempotency_keys 记时间戳）。

## 4. 组件改动清单

| 文件 | 改动 |
|---|---|
| `agent/detector.ts` | runDetection 加 `opts?: { incremental?: string[] }`；新增 meta_tag 维 + discovery 维；report 扩 `meta_tag/discovered` 计数 |
| `agent/proposer.ts` | suggestMetaTags 不动；新增 `discoverTagCandidates(items, defs)`（规则步）+ `nameTagCandidates(cands, fetchImpl)`（LLM 步） |
| `router.ts` | `/api/agent/detect` 透传 opts；report 字段透传 |
| `repo/ingest.ts` | batch 收尾钩子（开关+incremental） |
| `meta_tags.test.ts` / `detector` 测试 | 新维幂等/降级/发现轮用例 |

## 5. LLM 缝合点与降级（前置：换 401 key）

| 缝合点 | 依赖 | 降级 |
|---|---|---|
| meta_tag 建议 | 必须 LLM | 跳过+report 记录 |
| discovery 命名步 | 必须 LLM | 规则候选仍生成，暂存不产提案（`GSC_DISCOVERY_CANDIDATES` 表或复用 idempotency_keys 暂存） |
| dedupe/association/metadata | 规则为主 | 不受影响 |

## 6. 任务卡（七项）

1. **Purpose** meta-tag 识别端成体系：采集完自动冒打标建议，新标签有发现端，四轴锚点有机器建议通道。
2. **Scope** detect 五维轮 + ingest 钩子 + discovery 两步 + 测试；触发开关。
3. **Interacts** detector/proposer/router/ingest + tag_definitions/tag_values/proposals + G6 axis group。
4. **Does not own** 自动落库（永远提案制）· 四轴自动投影（G6 profile 层另事）· 向量检索 · LLM 修复。
5. **User flow** 传一批文件 → 片刻后提案面冒「建议打标/新标签定义」→ 逐条裁决；或手动 detect 全量体检。
6. **Minimum** detect 加 meta_tag 维（复用 suggestMetaTags）+ report 透传 + 测试；钩子与 discovery 第二批。
7. **Test method** vitest：新维幂等（同 item 不重复提案）/ 401 降级不阻塞 / discovery 同名不重复 / ingest 钩子仅增量。

## 7. 分批

| 批 | 内容 | 出口 |
|---|---|---|
| M1 | detect 加 meta_tag 维 + report + 测试 | 手动 detect 产打标提案（key 恢复后真值验证） |
| M2 | ingest 钩子（增量+开关+频率保护） | 传完自动冒提案，幂等实测 |
| M3 | discovery 两步 + pending_definition 触发端 | 新标签发现全链（含同名去重） |
| M4 | 四轴 axis group 接线（依赖 G6 B 批建组） | 「记到 trajectory」→提案 |

## 8. 不做

自动落库 · 四轴自动投影（G6 profile 层）· 跨用户标签 · 向量语义聚类（v1 规则分词）· 队列/微服务。
