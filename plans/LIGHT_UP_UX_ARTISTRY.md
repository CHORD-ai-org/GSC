# Light Up UX 评估与本地 Agent 优化提示词

Status: `PROPOSED` — 2026-11-20  
Scope: 仅优化 A2-1/B2-1/B2-2 已落地的 Light Up 体验、交互科学性、视觉完成度与已声明能力的实现一致性。不得借本任务扩展 PLAN-6/7/8，不得实现 C2-1 批量队列、PDF/OCR、向量检索、图数据库、后台自治流程。

## 1. 评估结论

当前流程方向正确：原文保留、规则切块、逐行人审、确认后入库，符合 GSC 的核心原则。但它目前更像“能工作的管理表单”，还不是用户用完会称为艺术品的完整体验。

主要问题不是缺装饰，而是三个层次没有形成同一种节奏：

1. **承诺与行为不一致**：界面承诺“输入 → 切块 → 命名 → 分类 → 审阅 → 入库”，实际存在短文本短路未接入、文件不切块、Agent 分类/理由被丢弃、机器建议直接改写用户值等偏差。
2. **认知流程断裂**：用户需要在“手动输入 / 采集管线 / 提案队列”之间理解三套模式；进入审阅后又面对重复的“保留 / 丢弃”控制、截断原文和没有上下文的长列表。
3. **关键时刻缺少品质**：真正值得被记住的时刻应是“外部信息被完整保存、机器解释被清楚照亮、用户确认后成为可追溯知识”。当前入库只是连续 `createItem`，没有完成感，也没有可靠的成功/失败叙事。

### 1.1 关键缺陷

| 优先级 | 问题 | 证据 | 影响 |
|---|---|---|---|
| P0 | `isFastPath` 只被测试，没有进入 Composer 或 Light Up 决策 | `src/lib/lightup.ts`、`src/app/App.tsx` | “两行以内回车即入库”看似存在，实际没有形成统一短路策略 |
| P0 | Agent 建议直接覆盖 `row.title`，分类与 rationale 未展示、未进入 proposals | `src/views/lightup.tsx` `applyAgentSuggestions()`、`server/agent/proposer.ts` | 违反“机器提议、用户裁决、分层可溯”，用户看不出改动来自哪里 |
| P0 | 入库是逐条顺序创建，失败会部分落库；再次提交可能重复 | `src/app/App.tsx` `persistSegments()` | 数据完整性与错误恢复不可靠 |
| P0 | 一个批次/多个文件共用一个 `sourceLabel` | `src/views/lightup.tsx` `addFiles()` / `rowsFromText()` | 多来源内容的 provenance 被合并，违背“来源全程保留” |
| P0 | 审阅区只显示原文前 400 字符 | `reviewContent` | “原文任何步骤可完整回看”没有真正满足 |
| P0 | 提案队列布局重叠、显示裸 UUID、信息密度失控 | `ui-prototype/shots/20-review-queue.png`、`reviewRow` CSS | 审阅效率和信任感显著下降 |
| P1 | 文件导入只生成一个文件名 Chunk，不执行规则切块 | `addFiles()` | 与“长文切成有意义 Chunk”的目标不一致 |
| P1 | URL 标题被丢弃，只保留正文与 URL | `fetchUrl()` | 语义命名缺少最有价值的来源线索 |
| P1 | “保留” checkbox 与“丢弃”按钮重复，拒绝后无清晰状态/恢复 | `lightup.tsx` | 控件语义不清，用户无法确认自己到底接受了什么 |
| P1 | 原始输入在“生成审阅”后被清空 | `generate()` | 输入阶段与审阅阶段之间失去原始上下文 |
| P1 | 所有行 key 由 index+length 生成，追加批次可能冲突 | `segmentText()` | React 更新可能作用到错误行 |
| P1 | Agent 未配置时按钮仍可点，只能在失败后知道 | `proposeForSegments()` | 系统状态不透明 |
| P1 | 语义色词典已有，但审阅流没有围绕“原文/机器/确认/异常”建立视觉层级 | `D-055` | 已有设计资产未转化为体验资产 |
| P2 | 长列表没有当前 Chunk 聚焦、进度和完成感 | `reviewRow.map()` | 大输入时用户容易迷失和漏审 |
| P2 | 文案宣称“类型/标签”，但 Meta Tag 尚属 PLAN-8，当前只有 raw type/domain | `PIPELINE_TYPES` | 产品承诺超出当前能力 |

### 1.2 体验目标

目标不是“加更多效果”，而是让 Light Up 像一次克制、精确、可信的档案仪式：

- **Capture**：随手记像落下一张便签一样快。
- **Illuminate**：长文进入后，原文、机器解释、用户决定三层像光谱一样清楚分开。
- **Commit**：确认不是点击黑色按钮，而是信息从临时状态稳定成为 GSC 中可寻址、可追溯的 Chunk。

“艺术品”来自比例、节奏、排版、语义色、微动效和完成感；不来自彩带、玻璃拟态、过度动画或营销式文案。

## 2. 目标流程

### 2.1 短内容：轻

用户输入不超过两行的短笔记并按 Enter：

1. 不显示切块、类型选择或审阅台。
2. 直接创建一个 `raw.document`。
3. 打开结果详情，并在详情内显示简短完成状态：“已保存 · 原文逐字保留 · 来源：<label>”。
4. 3 秒内完成；不得先弹出确认面板。

短路规则必须集中在一个纯函数中，UI 与测试使用同一规则，不得只靠组件条件。

### 2.2 长内容：清楚而不繁重

1. 输入区始终保留不可变的 Source Snapshot：标题、URL/文件名/粘贴来源、正文、字符数。
2. “生成审阅”产生 Chunk 草案，不删除 Source Snapshot。
3. 审阅使用“来源上下文 + 当前 Chunk”的编辑式布局；列表负责导航，当前 Chunk 负责决策。
4. 每个 Chunk 必须显示：
   - 原文全文（展开/收起，不以 400 字截断作为唯一视图）；
   - 规则建议或 Agent 的 Semantic Name；
   - 机器建议的 classification 与 rationale，rationale 必须带原文短引；
   - 用户最终决定：接受原建议 / 编辑后接受 / 拒绝该 Chunk。
5. 颜色只能辅助，必须同时有文字：
   - 原文灰：原文；
   - 机器紫：规则/Agent 建议；
   - 确认绿：用户已确认；
   - 异常红：需要修复。
6. 顶部显示 `已就绪 / 需要处理 / 已拒绝` 三个计数，底部使用 sticky confirmation bar，展示最终入库数量和来源数量。
7. 确认后展示完整 receipt：成功数量、来源、进入的详情；失败时不得静默部分提交。

## 3. 必须修复的模型与数据问题

1. **机器建议不得直接覆盖用户数据。**  
   对最终会持久化的 Chunk，机器建议及其 rationale/classification 应以 proposal 语义记录；用户接受/编辑/拒绝必须可区分。若 Chunk 被丢弃，不创建 GSC item。
2. **来源必须逐 Chunk 保存。**  
   每个 SegmentRow 携带自己的 `sourceLabel`、source kind、source title/locator；多文件不得合并为 `lightup:file`。
3. **入库必须可靠。**  
   使用一个批量、事务式 API 或等价的 all-or-none repository 路径。失败不得留下半批数据；重复提交不得产生重复项。每次创建只追加一条 `created` history event。
4. **稳定 key。**  
   草案行使用唯一 id，不得由数组 index、长度或文件时间戳推导。
5. **文件行为要说实话。**  
   当前只支持文本文件。文本文件应逐文件规范化并切块；PDF/OCR 未支持时，界面必须明确显示“当前仅支持文本文件”，不能让 30 页 PDF 的目标场景看起来已经可用。
6. **不要实现 PLAN-8 Meta Tag。**  
   可以展示 type/domain；不要伪造“标签已支持”。若需要 Meta Tag UI，只能标注为后续能力，并先取得用户批准。

## 4. 视觉与交互完成度

- 保持现有 light/dark、hairline、mono/Inter 字体、无阴影风格。
- 使用更宽的负空间、统一的 4/8/12/16/24/32 节奏、克制的字重差异。
- 每屏只保留一个主动作：短输入是“保存”，长输入审阅是“确认入库”。
- 机器建议使用细左边线或小标签，不要整卡变紫。
- 动效只表达状态：建议出现、用户确认、批次完成；120–220ms，遵守现有动画质量设置和 reduced motion。
- 禁止 confetti、炫光、3D、无意义渐变和过度 hover 效果。
- 错误文案必须说明发生了什么、哪些内容受影响、下一步是什么；不得只显示 `Light Up failed`。
- 空状态、加载状态、禁用状态均需有明确文案。Agent 未配置时应禁用或解释配置要求，而不是等点击后失败。
- 提案队列必须修复布局重叠；显示目标标题而不是裸 UUID，保留 ID 为次级 metadata。
- 1440×900 是主要验收尺寸；低于 900px 时审阅列与来源列可纵向排列，不得重叠。

## 5. 本地 Agent 执行提示词

```text
你是 GSC 仓库的本地实现 Agent。请优化 Light Up 的用户体验与流程科学性，让用户使用后觉得这是一件艺术品，但所有优化必须遵守仓库现有产品边界。

开始前严格按 AGENTS.md 顺序阅读：
THINKING.md、README.md、PROJECT_CONTEXT.md、DESIGN_BOUNDARIES.md、DEVELOPMENT_ROADMAP.md、PRODUCT_VISION.md §3.1/§10、INFORMATION_MODEL.md、MVP_USER_FLOWS.md、MVP_UI_SPECIFICATION.md、IMPLEMENTATION_STATUS.md、DECISION_LOG.md、KNOWN_ISSUES.md、plans/PLAN-2-light-up.md。
重点保持 D-044、D-046、D-047、D-048、D-053、D-054、D-055 的约束。代码与文档冲突时，以代码为“现状”，并记录到 KNOWN_ISSUES.md。

本任务目标：
把已经落地的 Light Up 从“可用表单”优化成一个完整、克制、可信的采集仪式。它应同时满足：
1. 短笔记极快；
2. 长内容的原文、机器解释、用户确认三层清楚可辨；
3. 来源与原文始终完整、逐条可追溯；
4. 确认入库可靠、可恢复、具有完成感；
5. 视觉有艺术品的秩序和细节，但不牺牲可理解性与可访问性。

请先写一个七项 Task Card 到 plans/LIGHT_UP_UX_ARTISTRY.md：
Purpose、Scope、Interacts with、Does not own、User flow、Minimum implementation、Test method。
再实现一个完整垂直切片，不先搭大而空的基础设施。

P0 必做：
- 统一短文本短路：不超过两行的笔记按 Enter 直接入库，跳过切块；短路函数、Composer/Light Up 调用和测试必须共用同一规则。
- 修复机器建议链路：Agent 的 semantic_name/classification/rationale 不得直接覆盖用户值；在审阅界面展示为机器建议，并把最终持久化 Chunk 的接受/拒绝决定以 proposal 语义留痕。原文/机器/确认必须视觉和数据都分层。
- 增加可靠批量入库：all-or-none，失败无半批数据，重试不重复，每项只生成一个 history event。
- SegmentRow 按条保存 sourceLabel/source kind/source title，多文件不得共用错误来源。
- 原文在任何步骤可完整展开查看；不能只保留 400 字预览。
- 修复提案队列重叠、裸 UUID、低可读性；目标项显示标题。
- 修复 draft key 冲突风险。
- URL 标题、规范 URL、抓取正文和来源标签必须进入来源预览；URL 在确认前只预览不落库。

P1 必做：
- 重构审阅为“Source Snapshot + Chunk 列表 + 当前 Chunk 决策卡”或同等清晰布局，但仍保留 D-046/D-053 的工作区与提案队列边界；若必须改变已 DECIDED 的信息架构，先在 DECISION_LOG.md 记录 PROPOSED 并停止等待确认。
- 将接受/编辑/拒绝表达为明确状态，移除重复且含混的“保留 checkbox + 丢弃按钮”。
- 文本文件逐文件切块；多文件逐文件保留来源。PDF/OCR 不实现，但 UI 要诚实说明只支持文本。
- 提供批次摘要、就绪/需处理/已拒绝计数、sticky 确认区、成功 receipt 与可恢复失败状态。
- Agent 未配置时提前说明或禁用，不制造点击后失败。
- 运用 D-055 语义色词典，但每种颜色都带文字标签；遵守现有 light/dark 和动画质量设置。
- 提升空状态、loading、error、focus、hover、disabled、reduced-motion 和 1440×900/窄屏表现。
- 删除“类型/标签都已支持”的误导文案；Meta Tag 不实现。

明确禁止：
- 不实现 C2-1 批量队列/整目录导入/大文档分段审阅；
- 不实现 PDF、OCR、浏览器插件；
- 不引入新依赖、向量库、图库、队列、微服务、后台自治 Agent；
- 不合并 Raw Information 与 Structured Object；
- 不让 Agent 或 Detector 直接写用户数据；
- 不把整个系统存进 JSONB；
- 不修改 Thylas；
- 不为视觉效果破坏信息可读性或操作可逆性。

实现顺序：
1. 先补可复现测试：短路、切块、来源逐条、批量原子性、proposal 留痕、URL 不落库。
2. 修复 P0 数据与状态问题。
3. 完成 P1 交互和视觉。
4. 更新 `src/views/lightup.tsx`、`src/app/App.tsx`、`src/lib/lightup.ts`、`src/lib/proposals.ts`、`server/router.ts`、相关 repo/agent 模块和 CSS。不要重写无关代码。
5. 保存 light/dark 的 Light Up 输入、审阅、提案队列和完成态截图到 `ui-prototype/shots/`。
6. 更新 IMPLEMENTATION_STATUS.md、KNOWN_ISSUES.md、受影响设计文档；有决策变化才更新 DECISION_LOG.md，不得把 PROPOSED 自升为 DECIDED。

验收标准：
- 两行内短笔记按 Enter 后 3 秒内出现在详情页，未进入审阅台。
- 长文本生成多个 Chunk；每个 Chunk 可完整查看原文，机器名称/classification/rationale 与用户最终状态清楚分层。
- 两个不同文件同时导入时，每个 Chunk 的文件名/来源正确，且文本文件各自切块。
- URL 只有在用户确认后才产生 item；抓取失败不影响已输入草稿。
- 批次中途失败时不产生部分 item；重复执行不重复入库。
- Agent 建议不会直接覆盖用户字段；接受/拒绝可以追溯。
- 提案队列在 1440×900 无重叠、无裸 UUID 主显示。
- 光暗主题、reduced motion、键盘 focus 和窄屏均可用。
- 不增加依赖，不扩大产品域。

验证命令：
- `npm run check`
- `npm test`
- `npm run build`
- API 启动后 `npm run api:check`
- 更新或运行 UI smoke，覆盖短笔记、长文本、双文件、URL、失败恢复、提案队列；
- `node scripts/ui-shots.mjs http://localhost:5174/ light`
- `node scripts/ui-shots.mjs http://localhost:5174/ dark`

最终必须按 AGENTS.md 的固定格式提交：
Completed / Modified Files / Design Decisions / Assumptions / Known Issues / Next Steps / Verification。
不得虚构测试结果；环境限制要明确记录。
```

## 6. 建议的验收体验脚本

### A. 便签时刻

输入两行笔记，Enter。用户应感觉“落下了，而且不会丢”，而不是“完成了一次表单提交”。

### B. 研究长文时刻

粘贴长文或导入两个文本文件。用户应随时知道：

- 原文来自哪里；
- 哪些句子被切成了 Chunk；
- 哪些名字/分类是机器建议；
- 哪些决定是自己做的；
- 最后会保存什么。

### C. 信任时刻

模拟第 3 条入库失败。界面应明确显示“本批未入库”，原草稿和审阅决定仍保留；修复后重试不得产生重复。

### D. 完成时刻

确认入库后，用户应看到来源、数量、进入详情的路径。完成态要安静、稳定、有秩序，不用庆祝动画制造廉价兴奋。

## 7. 范围外但值得后续考虑

以下只能作为 `PROPOSED` 讨论，不在本次直接实现：

- 将三标签信息架构改为单一自适应 Flow；
- C2-1 批量与大文档分段审阅；
- Meta Tag 债选和 PLAN-8；
- PDF/OCR；
- 跨来源合并、重复项交互式对比；
- 更丰富的撤销/版本树。
