# USER_PROFILE_INIT_PLAN.md — 初始用户画像构建 Pipeline（脑暴+执行计划）

Status: `DECIDED` — 2026-11-26（创始人脑暴定调+原型三屏；U1 已执行）。
原型：Clipboard 三屏（源连接 → Meta User Profile 生成+Tau 介绍 → Tau 引导+语音）。

## 0. 文献检索结论（2026-11-26，5+5 源）

| 来源 | 可抄的点 |
|---|---|
| **ai-know-you**（GitHub，五阶段 onboarding wizard） | Intro→Dig→Assessment→**Calibration**→Assembly；Calibration=「Agent 展示理解→人批准/纠正才锁存」——**与 GSC 提案制完全同构**；分层 profile（Facts/Preferences/Boundaries 各自演化）；重跑幂等+merge-aware；敏感类别先脱敏 |
| Agent 画像冷启动（guanweilu.cn） | 画像条目三字段=**结论/来源（用户说 vs Agent 推）/置信度**；被否决的进「禁止再犯」；ChatGPT 的克制（只记明确表达，不把推断存成长期）值得抄；画像存 prompt 里错误会被放大——所以要当内存管 |
| Progressive Profiling（CIAM 三篇） | signup 最小化（email only），其余**上下文时机采集**；每条带 provenance（self-asserted/social/verified）；每次询问带 reason、skip 永远允许、不重复问 |
| Birth System（90s 冷启动） | 外部数据合成→带置信度（0.4-0.6）的初始信念；SLA 意识；双模式（全量 onboarding/动态补充） |
| 渐进披露 | **3-5 个选择的甜点区**；一次一问；认知负荷红线 |

## 1. 映射：原型三屏 ↔ Pipeline ↔ GSC 既有资产

| 原型屏 | Pipeline 阶段 | GSC 资产（复用为主） |
|---|---|---|
| 屏 1「我们从哪里开始认识你」源 logo 连接+composer | **S1 采集**：源授权（X 等）→ URL/文本 ingest | sources+ingest/url+ingest/batch ✅（X OAuth 后置） |
| 屏 2「正在构建你的初始用户画像→已完成→容我介绍 Tau」 | **S2 合成**：Meta User Profile 锚点 + 用户画像组打标提案 + 伴灵名 | **buildInitialProfile（U1 已落）**+提案制 ✅ |
| 屏 2 末「继续画像的初始化:3」 | **S3 校准**：逐条裁决（accept 才落库） | proposals resolve ✅ |
| 屏 3 Tau 引导+语音+scroll 提示 | **S4 引导**：Tau 引导对话+过渡动画+Fish Audio 语音 | 后置（F3 依赖外接 TTS） |

## 2. 关键设计决策（文献+原型定调）

1. **Meta User Profile=锚点条目**：`raw.document` + `source_label='user_profile'`（幂等查找键），
   不新增 item type（G6 spec 修订再议）；聚合视图=`GET /api/profile`（D-066 已有，confirmed only）。
2. **Calibration=提案制**：画像条目（meta_tag 提案挂锚点/来源 chunk）逐条裁决——
   「人批准才锁存」与 D-042 天然同构，零新机制。
3. **条目三字段**：proposed_value=结论 · source=agent（来源标注）· rationale=profile-init+why
   （置信度人判）；被 reject 的进裁决留痕（禁止再犯=后续迭代项）。
4. **限定两组**：打标建议只出「用户画像/个人经历」（3–5 甜点区，渐进披露）。
5. **伴灵名**：`users.companion_name`（0017 迁移），默认 Tau，屏 3 可改。
6. **语音（Fish Audio）**：屏 3 增强，最后一批——先把骨架跑通。

## 3. 分批

| 批 | 内容 | 出口 | 状态 |
|---|---|---|---|
| **U1** | 后端管线：锚点+伴灵名+组限定打标提案+`POST /api/profile/init` | 3/3 测试+真链 | ✅ 本轮 |
| **U2** | 屏 1/2 UI：onboarding 源连接页（logo 卡+composer）→ 合成页（依次展示 notes+Tau 介绍+命名输入） | 全新用户走完屏 1→2 | 待执行 |
| **U3** | 屏 3 引导：Tau 对话引导+命名确认+过渡动画+scroll 提示 | 原型三屏全链 | 待执行 |
| **U4** | 语音（Fish Audio API）+ X OAuth 接入 | 语音可开关 | 后置 |

## 4. 任务卡（七项）

1. **Purpose** 新用户注册后 90 秒级获得初始画像（Birth System 口径），且全程人裁决（D-042）。
2. **Scope** 采集接入→画像合成管线→校准裁决→Tau 引导；语音与 X OAuth 后置。
3. **Interacts** agent/profile-init.ts（新）· repo/users/tags/items/proposals · orchestrator（可选复用）· 0017 迁移。
4. **Does not own** 新 item type · 自动落库（提案制红线）· X OAuth 实现 · TTS 实现 · 权限扩展。
5. **User flow** 注册完 → 屏 1 连源/丢 URL → 屏 2 依次展示「正在构建→已完成→容我介绍 Tau」→
   命名 → 「继续」→ 提案面逐条校准 → 屏 3 Tau 引导 → 进主界面。
6. **Minimum** U1 后端管线（本轮已交付）。
7. **Test method** vitest（锚点幂等/伴灵名/组限定提案/401 降级）+ 真链 curl + 屏 1-3 截图对照原型。

## 5. 不做

自动落库 · 新 item type · X OAuth（U4 前）· Fish Audio 直接集成（U4）· 敏感信息自动脱敏（文献建议，后续迭代）· 向量检索。
