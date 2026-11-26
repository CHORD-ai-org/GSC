# UI_PARITY_FIX_PLAN.md — UI 保真优化计划

Status: `PROPOSED` — 2026-11-25。依据：`UI_PARITY_AUDIT.md`（P0 九项/P1 四项，结论=未达标）。
目标：当前对话流达到创始人截图的**原文、形态、位置**标准，并具备「丝滑选择体验」（选择优先、
点选即流转、可返回、末步可读清单）。**基准工作暂停，本计划优先。**

## 0. 验收口径（重写，不再用模糊措辞）

每条 R 修完：① 打开同一场景（发「把智能床垫项目的数据整理一下，先弄 onboarding 让我修改
关键信息」）② 截图 ③ 与原型逐条抄录**界面原文**对照 ④ `UI_PARITY_AUDIT.md` 对应 P0 行打 ✅
并贴截图路径。缺任一不算完成。

## 1. 优化步骤（R1→R5，每步独立截图）

### R1 · 气泡与顶栏（P0-1 / P0-9）
- **气泡**：`chat.module.css` —— 用户泡改**浅蓝圆角大泡**（#E6F1FB 类）、右对齐、max-width≈450、
  字号 13、不截断、padding 宽松；Agent 宣言纯文本无泡。
- **顶栏**：`ChatView.tsx` 消息流上方加 header——标题「"智能床垫"项目的数据整理」（用会话标题）、
  右侧搜索/面板线性图标（内联 SVG，无依赖）、底部 0.5px 分割线。
- **验**：截图 P0-1/9 行对照（浅蓝大泡原文完整 + 顶栏图标分割线）。

### R2 · 任务卡版式 + 语义标题（P0-2 / P0-3 / P0-4）
- `TaskCard.tsx`：**竖排四步**（collect/synthesize/compose/confirm 各一张白底细边小卡，01→04）；
  Onboarding（confirm）**默认展开绿细边**，steps 用原型英文原文：**Information Review /
  Structured Data Preparation / User Confirmation Before Write**（同步修 `defaultPipeline` 的
  confirm.steps 与计划 prompt）。卡内 PATCH 追加的段（如导出 PDF）放**附加步骤区**，不挤主四步。
- **卡内右栏**：grid 左=竖排管线、右=输入区：「还有想添加的？」+ `+` + 麦克风（内联 SVG）+
  蓝色圆发送钮。
- **语义标题**：任务标题不再用指令原文——接语义命名（D-107 titler 能力或本地模板收束：
  「"X"项目的 Y 信息收集与项目文档构建」）；LLM 可用时由计划 prompt 产 ≤40 字语义标题。
- **验**：P0-2/3/4 行对照（语义标题 + 竖排四步 + 英文三步展开 + 卡内右栏）。

### R3 · 播报精简 + 灰说明块（P0-5 / P0-6）
- `orchestrator.ts`：对话流**只保留四条用户可读播报**——「正在思考」（计划生成前）、
  「正在启动信息收集管线」（runStages 启动）、「启动关键信息的Onboarding的交互流」（confirm 停点）、
  「开始编辑项目文件夹」（confirm 完成）；内部执行轨迹（正在执行/已生成 N 提案/草稿/失败细节）
  **不再进消息块**，只留 `task_events` 审计线（失败红标仍在任务卡）。同步更新 Step 9 播报测试口径。
- `ChatView.tsx`：flow 块改**浅灰底圆角说明块**，内文用原型两行原文（「为了让开发原型页面容纳下
  更多内容…在真实对话中这个生成的UI应该弹出来并占据页面右侧的大部分」），点击开 Drawer。
- **验**：P0-5/6 行对照（对话流只有四条灰字 + 灰底说明块）。

### R4 · Drawer 语义化 + 丝滑选择体验（P0-7 + 选择五规则）
- `uispec.ts`：生成 prompt 要求**语义标题**（「关键信息确认」）+ **带预填的 review** + **带候选的
  choose**；模板兜底升级为内置候选（范围: 本周/全部/最近30天 · 关键信息: 项目名/时间范围 ·
  方式: 主题/时间线/项目阶段），**不再只产空 collect**——LLM 401 时仍能丝滑选择。
- `FlowPanel.tsx`：从一屏表单改 **stepper**——① 选择范围 ② 关键信息保留/改 ③ 整理方式 ④ 写入确认；
  **点选即流转（260ms）**·任何一步可返回·只展示当前步·进度 1/4；末步可读清单
  （打标/归块/生成），确认后产提案待裁决。**`confirm write:` 技术原文永不渲染**（降级行显示为
  「写入清单（待确认）」而非原文）。标题=DSL 语义标题。
- **验**：P0-7 行 + 五规则逐条（可点原型截图对照）；确认后提案对账仍通。

### R5 · composer 复原（P0-8）
- `ChatView.tsx` 底部：胶囊输入「Describe something to build, change, or fix」+ `+`；下一行
  **This computer / Choose folder**（左）与 **mimo-v2.6-pro / High / Auto**（右，先只读展示）、
  蓝色圆发送钮。附件/模型交互后置，形态先到位。
- **验**：P0-8 行对照（胶囊+附件行+模型条）。

## 2. 任务卡（七项）

1. **Purpose** 对话流界面达到创始人截图保真标准，且 onboarding 是丝滑选择体验。
2. **Scope** chat.module.css/ChatView/TaskCard/FlowPanel · orchestrator 播报与 defaultPipeline ·
   uispec 生成器与兜底模板 · UI_PARITY_AUDIT 打勾。不含 benchmark（暂停）。
3. **Interacts** 上述文件 + strings（中英文案）+ 既有 uiflow 解析器 + 提案链（不改语义）。
4. **Does not own** 产品逻辑重构 · 提案制变更 · 数据模型变更。
5. **User flow** 发原型指令→浅蓝泡→顶栏→语义任务卡（竖排四步+英文三步+右栏输入）→
   「还有想添加的」→灰说明块→Drawer stepper 四步点选→写入清单确认→提案。
6. **Minimum** R1–R5 全部 P0 清零 + 五条截图对照贴档。
7. **Test method** 每 R 同场景截图逐原文对照；回归 vitest（播报测试更新）+ tsc/lint 全绿。

## 3. 不做（本期）

benchmark（暂停）· 附件/模型选择器真实交互（R5 只读形态）· 多语言对照 · 动画微交互调优。

## 4. 残余确认点

1. R2 语义标题：用本地模板收束够不够，还是必须接 D-107 titler 真实调用？（影响 P0-2 达成度）
2. LLM key 401 未换：R4 的丝滑体验必须靠**兜底模板候选**实现——是否同意「先做无 key 版丝滑」？
