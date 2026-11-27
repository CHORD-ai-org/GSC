# EXTERNAL_DOCS_PLAN.md — 对外文档完善计划

> 2026-11-28 · Status: `COMPLETE`（E1–E5 全部完成；E2 实证全绿、E4 对账零偏差；决策 D-118）
> 目标：第一次打开仓库的人（或 Agent）30 秒看懂 GSC 是什么，10 分钟跑起来，5 分钟接进去。
> 原则：对外只呈现「门面层」；90 份内部计划/审计文档不搬上台面。

## 1. 现状问题（README 具体过期点，2026-11-28 核对）

| # | 问题 | 证据 |
|---|---|---|
| 1 | 状态行停在 2026-11-20（"PLAN-8 in progress"） | 缺 11-23→11-28 全部进展：G2 三端采集、G7 对话工作台、G8 onboarding、Overview 重设计、META_TAG 管线、动态提示行 |
| 2 | 仓库结构树停在 Phase 04 | 缺 `sdk/ integrations/ dashboard/ docs/ plans/ server/mcp/ migrations/ ui-prototype/shots/` |
| 3 | Setup 段写 "Not applicable yet" | 实际 `npm run api / dev / mcp / worker / db:migrate` 全可跑 |
| 4 | 零截图 | `ui-prototype/shots/` 有 60+ 张现成（home/ov/g8/lightup…） |
| 5 | 概念黑话 | Chunk/Cluster/Context/MetaTag/提案制 无解释直接出现 |
| 6 | "Read first" 怼 10 份内部文档 | 外部读者第一眼被吓退 |
| 7 | 对外接入面零入口 | MCP 9 工具、/foragents、sdk/、integrations/（codex/opencode/workbuddy/gsc-push）README 均未提及 |
| 8 | 环境事实表是 11-16 快照 | Node/npm 版本、端口、PGlite 路径需重验 |

## 2. 边界（Does not own）

- 只改对外文档面：README、`docs/` 对外子集、截图资产、接入文档审校。
- 不改内部计划/审计文档内容（DOCS_MAP 标注除外）。
- 不动代码。E2 实证中发现的真 bug 记 `KNOWN_ISSUES.md`，本计划不修。

## 3. 任务卡

### E1 · README 重写（门面，最高优先）

1. **Purpose** — 仓库门面：30 秒懂 GSC 是什么、能干嘛。
2. **Scope** — `README.md` 单文件全量重写。
3. **Interacts with** — `PRODUCT_VISION.md`（措辞对齐）、`API_CONTRACT.md`、`sdk/README.md`、`docs/agents/foragents.md`、`assets/gsc logo.png`。
4. **Does not own** — 内部文档内容、代码、LICENSE 选择。
5. **User flow** — 打开仓库 → 定位一句话 + logo/截图 → 5 个概念各一行 → 快速开始 → 能力清单（采集/组织/对话/MCP）→ 三步接入（MCP/SDK/CLI）→ 文档导航（4-6 份）→ License。
6. **Minimum implementation** — 定位 + 概念 + 快速开始 + 结构树 + 导航五段（无截图版）。
7. **Test method** — 陌生人走查：只按 README 从零跑通 dev+api，<10 分钟。

新 README 结构草案：

```text
# GSC — Global Shared Context
一句话定位（碎片信息 → 持久、可寻址、可复用的 context）
hero 截图（Start / Overview 双视角）
## Why / 是什么（Chunk·Cluster·Context·MetaTag·提案制，各一行）
## Quickstart（npm install → db:migrate → api → dev，含端口表）
## Capabilities（三端采集 Light Up / 组织打标 / 对话工作台 / 溯源）
## For Agents & Developers（MCP 9 工具 / SDK / gsc-push CLI / /foragents）
## Repo layout（当前真实树）
## Documentation（对外导航 ≤6 份）
## License
```

### E2 · Quickstart 实证

1. **Purpose** — README 里的每条命令真实可跑，不骗人（AGENTS.md：never fabricate）。
2. **Scope** — 全新临时目录 clone → 按 README 从零执行；核对端口表（api 8788 / dev 5174）、PGlite 路径、可选 LLM/MCP 段。
3. **Interacts with** — `package.json` scripts、`.env.example`、`KNOWN_ISSUES.md`（发现 bug 记入）。
4. **Does not own** — 修 bug、改脚本。
5. **User flow** — 按文档逐条复制命令 → 记录实际输出/偏差 → 回写 README。
6. **Minimum implementation** — api+dev+mcp 三条链实跑 + 端口表核对。
7. **Test method** — 逐条命令与 README 字面一致且退出码 0；偏差全部回写。

### E3 · 截图资产

1. **Purpose** — 第一眼建立产品可信度。
2. **Scope** — 从 `ui-prototype/shots/` 选 4-6 张主图（Start/Overview 双视角、Light Up、对话工作台、G8 onboarding），统一放 `docs/images/`（或 `assets/`），README 引用；必要时用现有 `scripts/shot-*.mjs` 重截。
3. **Interacts with** — `ui-prototype/shots/`、`scripts/shot-*.mjs`、`assets/gsc logo.png`。
4. **Does not own** — UI 改动、设计稿。
5. **User flow** — README hero 区 → 点开大图 → 对照 Quickstart 跑出来的界面。
6. **Minimum implementation** — 选图 + 拷贝 + README 嵌入（不重截）。
7. **Test method** — GitHub 预览渲染正常、无本地绝对路径、无敏感信息。

### E4 · 接入文档收口

1. **Purpose** — 人和 Agent 都能找到接入入口，且三处口径一致。
2. **Scope** — 审校 `docs/agents/foragents.md`、`sdk/README.md`、`API_CONTRACT.md` 对外面（端口/PAT/工具数 9/命令字面一致）；README「For Agents」段链接收口。
3. **Interacts with** — 上述三份 + `server/mcp/tools.ts`（工具数对账）。
4. **Does not own** — 改 MCP 代码、发 SDK 新版、F2/F3 内容扩写（FORAGENTS_PLAN 另轨）。
5. **User flow** — 新 Agent 进 /foragents → 按文配置 MCP → tools/list 返回 9 工具 → 提案制两铁律在目。
6. **Minimum implementation** — 三份文档端口/token/命令逐项对账 + 修正。
7. **Test method** — 对账表：文档字面 vs 代码注册表 vs 实跑输出，三方一致。

### E5 · 文档分层导航

1. **Purpose** — 对外/内部两层分开，新人不迷路，内部索引不失效。
2. **Scope** — README「Documentation」段只链对外子集（PRODUCT_VISION / INFORMATION_MODEL / API_CONTRACT / foragents / sdk / REMAINING_WORK）；`DOCS_MAP.md` 增加「对外入口」标注行 + 回写本计划状态。
3. **Interacts with** — `README.md`、`DOCS_MAP.md`。
4. **Does not own** — DOCS_MAP 全量重整理（已标 ⚠️ 的 13 份过期文档另轨）。
5. **User flow** — 外部读者走 README 导航；内部协作者仍走 DOCS_MAP 全图。
6. **Minimum implementation** — README 导航段 + DOCS_MAP 一行标注。
7. **Test method** — 导航链接逐个可达；DOCS_MAP 与 README 不互相矛盾。

## 4. 执行顺序与依赖

```text
E2（实证） ──数据──▶ E1（README 重写） ──▶ E3（截图嵌入） ──▶ E5（导航收口）
                                      E4（接入对账）可与 E3 并行
```

E2 先行：先验证再写字，避免 README 二次返工。

## 5. 决策（2026-11-28 创始人拍板）

| # | 决策 | 结果 | 状态 |
|---|---|---|---|
| O1 | README 语言 | **英文单语**（README.md 即门面，不出中文版） | `DECIDED` |
| O2 | 范围 | **E1–E5 全做** | `DECIDED` |
| O3 | 内部文档暴露度 | **只链对外子集**（DOCS_MAP 留内部，不上首页导航） | `DECIDED` |

## 6. 验收（整批）

- [ ] 陌生人走查：只看 README 完成 install→run→接入，<10 分钟。
- [ ] README 内所有命令、端口、工具数与代码一致（E2 对账表为证）。
- [ ] 截图渲染正常、无敏感信息、无绝对路径。
- [ ] 对外导航链接逐个可达；DOCS_MAP 回写本计划状态。
- [ ] 交付按 AGENTS.md §6 手递手报告格式收尾。
