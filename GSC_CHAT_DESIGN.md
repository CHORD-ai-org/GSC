# GSC_CHAT_DESIGN.md — GSC 对话（Conversation Workspace）设计方案 v2

Status: `PROPOSED` — 2026-11-25（v2 重脑暴，按创始人批注重构）。
依据：创始人批注五条（§0）· 交互原型 · GOALS「对话口径」· DESIGN_BOUNDARIES（待演进 §8）。

## 0. 批注全录 → 设计承诺

| # | 批注（原话） | 本方案的正面回答 |
|---|---|---|
| 1 | Agent 会创建一个类似 Intelligent UI 的东西来向用户展示 Agent 所要执行的操作 | **界面是 Agent 的第三种输出模态**（§2.1）；操作先有 UI 投影再执行（§2.2） |
| 2 | 要从这个交互反推我们的架构设计 | 交互事实→架构结论的推导链（§1），架构随交互原语走 |
| 3 | Sidebar 也有 UI 的更新，到时候记得制定相关计划；注意有两个「最近」，上面的是全类型，而下面的「最近」专指对话 | 双时间线口径（§7）；SIDEBAR_PLAN 另出 |
| 4 | 这里所展示的管线只是演示，具体要看 pipeline 是怎么设计的 | 管线=计划的投影，执行归 Light Up 等既有引擎（§4）；stage 语义定死 |
| 5 | 那个 onboarding 的 UI 就是我们需要通过一种类似 DSL 的方式来主动生成的 | UI DSL=界面输出语言，按**意图**设计词汇表（§5）；渲染白名单 |
| + | 原型内嵌：「真实对话中这个生成的 UI 应该弹出来并占据页面右侧的大部分」 | DSL 面=右侧大面板（Drawer 占 60-70% 宽），非行内小卡（§5.4） |

## 1. 交互推导链（从交互反推架构）

场景原话（原型）：用户「你把我关于"智能床垫"项目的所有数据都整理一下，记住先弄一个
onboarding 让我修改关键信息」→ Agent「好的，我先调用相关的组件查找」→ **新建任务**卡
（查找数据→分析融合→撰写计划→Onboarding）→ 卡内「还有想添加的？」→
「启动关键信息的 Onboarding 的交互流」→ 生成 UI → 「开始编辑项目文件夹」。

| 交互事实（看得见的） | 架构结论（必须有的） |
|---|---|
| Agent 把「将要执行的操作」画成任务卡+管线 | 操作必须**先被描述再被执行** → 计划是持久对象（task/stages），不是内存态 |
| 管线卡内能输入「还有想添加的？」改计划 | 计划对象必须**可对话式增改** → 卡内消息回流成 stage 变更 |
| onboarding UI 是自动生成的 | 存在**界面输出通道**：DSL 文本→渲染器→交互面→结构化结果回流 |
| 「User Confirmation Before Write」 | 一切写落库走提案/确认（D-042 不变式，对话化表述） |
| 管线只是演示，以真实 pipeline 为准 | 管线是**投影**：stage 与既有引擎（Light Up/采集/titler）一一编排，不造新执行器 |
| 生成 UI 弹出占右侧大部 | 对话布局有**工作面板位**（右侧 Drawer），与消息流并存 |

一句话反推结论：**GSC 对话的交互原语是「可见的操作」——每步操作先以 UI 投影给用户
（可改、可确认），再以提案制落库。**

## 2. 核心概念（脑暴产物）

### 2.1 Agent 的三种输出模态
| 模态 | 载体 | 例子（原型原话） | 确认性 |
|---|---|---|---|
| 文本 | 消息 | 「好的，我先调用相关的组件查找」 | 不需 |
| **界面** | DSL 生成的交互面 | onboarding 表单（占右侧大部） | 操作即输入 |
| 提案 | 机器产物待确认 | 命名/归块/meta_tag（既有 D-042） | 需确认才落库 |

界面模态不是聊天贴图——它是 Agent「展示将执行的操作」的**协议**：用户在界面上的每个动作
（改字段/勾选/确认）都回流成结构化数据，进任务或提案链。

### 2.2 消息 = 块序列（rich message）
任务卡、管线、播报直接出现在消息流里 ⇒ 消息不是纯文本，是**块数组**：
`text`（正文）· `operation`（任务卡/管线卡）· `flow`（DSL 交互面引用/内联）·
`reference`（条目引用）· `note`（灰色播报，如「正在启动信息收集管线」）。
块是**序列化 UI 描述**——这就是「Agent 创建 Intelligent UI」的落点。

### 2.3 任务卡 = 计划的投影
- task（持久）：语义标题（D-107 titler 生成）+ 一句话目标 + 状态。
- stage（持久）：语义类型 `collect | synthesize | compose | confirm` + 展开步骤 + 状态机
  `pending → running → awaiting_user → done | failed`。
- **`awaiting_user` 是一等状态**：管线停在需要用户输入处（onboarding 就是 confirm 型 stage
  的 awaiting_user 停点），异步可恢复。
- 卡内「还有想添加的？」= 对 task 的自然语言 PATCH → 产/改 stage（走提案或即时编排，§6）。

### 2.4 双时间线（批注 #3）
- 顶部「最近」=**信息时间**（全类型条目：chunks/objects/提案痕迹）。
- 底部「最近」=**对话时间**（会话列表：每行=一次工作对话，如"智能床垫"项目的数据整理）。
- 两条时间线语义不同，不合并、不复用组件数据源。

## 3. 数据模型（v2，消息块模型）

- `conversations`（id, title, created_at）· `messages`（id, conversation_id, role, created_at）·
  **`message_blocks`**（id, message_id, kind[text|operation|flow|reference|note], order,
  ref_id, content）——块即 UI 描述，content 为受限结构列（非 JSONB 记录系统）。
- `tasks`（id, message_id, title, goal, status）· `task_stages`（id, task_id, kind, name,
  order, status, steps, detail）。
- `uiflows`（id, task_id, stage_id, kind, dsl_text, status[draft|active|done|abandoned]）。
- 写路径不变式：落库动作→提案/确认（D-042）；uiflow 的 confirm 动作即提案确认的对话化入口。

## 4. 管线语义（批注 #4：以真实 pipeline 为准）

**两层分离**：任务卡管线是**计划/投影层**；执行层是既有引擎。

| stage 语义类 | 执行引擎（既有） | 产物 | 停点 |
|---|---|---|---|
| collect（查找数据） | items 查询/meta 筛选/采集适配器（G2） | 条目集（reference 块） | 无 |
| synthesize（分析融合） | Light Up 管道 + Agent 建议 | 提案集（待确认） | 可选：确认提案 |
| compose（撰写计划） | 条目组装 + titler（D-107） | 文档草稿（reference 块） | 可选：审阅 |
| confirm（Onboarding） | **UI DSL 交互面** | confirmed 写入 | **awaiting_user**（常态） |

- stage↔引擎是**编排关系**：一个 stage 调一次或多次引擎，引擎不知道任务卡存在。
- 原型的四段管线（查找/融合/撰写/Onboarding）即四类语义的实例化。

## 5. UI DSL = 界面输出语言（批注 #5 重脑暴）

### 5.1 按意图设计词汇（不按控件设计）
| 词 | 意图 | 例子 |
|---|---|---|
| `collect` | 收集用户输入 | onboarding 关键信息表单 |
| `review` | 审阅并可改写 | Information Review（改关键信息） |
| `choose` | 从候选选择 | 归块候选/方案二选一 |
| `confirm` | 写前确认 | User Confirmation Before Write |
| `note` | 播报/说明 | 「启动 Onboarding 交互流」 |
| `reference` | 引用条目 | 展示命中的条目清单 |

（原型 Onboarding 三步恰是：review → collect → confirm——词汇表与原型对齐。）

### 5.2 DSL 形态（受限、可白名单解析）
```
flow "关键信息确认"
  review 字段组: [项目名, 时间范围, 关键人]     # 可改写，值来自 synthesize 产物
  collect 字段: [期望的整理粒度, 排除项]        # 新输入
  confirm 写入: proposal(meta_tag, project)    # 显式声明写什么
```
- Agent 产 DSL 文本 → 渲染器**白名单**解析（词表+字段类型+引用 id）→ 交互面。
- 安全边界：无脚本/无样式/无网络/无任意查询；`reference` 只能指向已授权条目。
- 用户操作 → 结构化结果（字段值/选择/确认位）→ 回填 stage.detail 与提案链。

### 5.3 生成时机
DSL 不是预定义模板——Agent 在对话推进中**按需生成**（onboarding 在 compose 之后、写入之前），
落 `uiflows.dsl_text`，可重生成（draft→active）。

### 5.4 布局承诺（原型内嵌批注）
真实对话中生成的 UI **弹出并占据页面右侧的大部分**（Drawer ≈ 60-70% 宽）：消息流不被淹没，
交互面与任务卡并存；移动端/窄屏退化为全屏页。

## 6. 卡内对话「还有想添加的？」

- 输入框在任务卡内，问的是**计划**不是闲聊。
- 语义=对 task 的 PATCH：「再加一步导出 PDF」→ 产 stage（compose 后追加）。
- 处置走提案（推荐）或编排者即时应用（纯增步骤、不触写入时）——写入性变更恒走提案。

## 7. Sidebar 口径（批注 #3；细化另出 SIDEBAR_PLAN）

- 两个「最近」：顶部=全类型信息时间线；底部=**对话专属**（会话列表）。
- 分组现况：通用（开始/总览/最近）· 信息（原始信息/结构化对象）· 组织（关联组/上下文）·
  同步与导出 · 置顶 · 最近（对话）。
- 组件级更新（图标/折叠/置顶交互）→ **SIDEBAR_PLAN 另出**（批注原话）。

## 8. 边界演进（显式决策，非静默改）

| 日期 | 口径 | 出处 |
|---|---|---|
| 11-23 | 「完整会话 UI 归 Thylas」 | GOALS / DESIGN_BOUNDARIES |
| 11-25 | **GSC 对话工作面**入 GSC（消息流+任务卡+管线+DSL 面+对话列表） | 创始人批注+原型 |

理由：任务卡/管线/DSL 全以 GSC 信息对象为语义底座；通用会话/展示仍归 Thylas。
确认后更新 DESIGN_BOUNDARIES（conversations 行拆分）+ DECISION_LOG 记变更。

## 9. Task card（七项）

1. **Purpose** 让 Agent 的操作「可见、可改、可确认」——可见操作原语 + 三种输出模态落地。
2. **Scope** §3 模型 + ChatView（消息块渲染：文本/任务卡/管线卡/播报/引用）+ 卡内 PATCH +
   DSL 渲染器与右侧面板 + 双时间线的数据源。不含 SIDEBAR_PLAN 细化、语音。
3. **Interacts** `schema.ts`/migrations（0015）· `repo/chat.ts`（新）· `agent/orchestrator.ts`
   （任务编排：调用 proposer/pipeline/titler）· `agent/uispec.ts`（DSL 生成）· `router.ts` ·
   `src/views/chat/`（ChatView/MessageBlocks/TaskCard/FlowPanel）。
4. **Does not own** 通用 Agent 运行时（WAM）· 通用会话展示（Thylas）· 自由画布 · 通用前端
   DSL · 绕过提案制的直写。
5. **User flow** 发指令（引用夹）→ Agent 宣言+任务卡（管线可见）→ 卡内「再加一步」→
   推进到 confirm stage → 右侧弹 DSL 面（review/collect）→ 确认写入 → 提案落地 →
   底部「最近」回看对话。
6. **Minimum（V1）** 消息块模型 + ChatView 渲染（text/note/operation 块）+ task/stage 持久 +
   卡内 PATCH（产 stage）+ stage 推进（collect/synthesize/compose 跑既有引擎）。
   V2：DSL 渲染器 + 右侧面板 + confirm 接提案。V3：双时间线侧栏 + 操作播报完备。
7. **Test method** vitest（消息块 CRUD/PATCH 幂等/stage 状态机含 awaiting_user/DSL 白名单
   解析拒绝非法词）+ 手动腿（发指令→卡→加一步→右侧 DSL 面→确认→提案对账）+ 截图。

## 10. 分期

| 期 | 交付 | 验收 |
|---|---|---|
| V1 | 消息块+任务卡/管线卡+卡内 PATCH+stage 推进（跑真引擎） | 发指令出卡；「再加一步」成 stage；collect/synthesize 产物可见 |
| V2 | UI DSL（六词）+右侧 Drawer + confirm→提案链 | onboarding 全程：review 改值→collect 输入→confirm 落提案 |
| V3 | 双时间线侧栏（SIDEBAR_PLAN）+播报/reference 块完备 | 两「最近」各司其职；完整对话回放可审计 |

## 11. 不做（本期）

通用 Agent 框架 · 自由画布/通用前端 DSL · 多用户/云同步 · 绕过提案制直写 · 语音输入 ·
会话运营类功能。

## 12. 确认点

1. 边界演进（§8）：GSC 对话工作面入 GSC——确认后改 DESIGN_BOUNDARIES + 记 DECISION_LOG。
2. **消息=块序列**模型（text/operation/flow/reference/note 五类块）——ok？
3. DSL 按**意图**六词起步（collect/review/choose/confirm/note/reference），生成式而非模板式
   ——ok？
4. DSL 面=右侧大 Drawer（原型内嵌承诺）+ `awaiting_user` 为 stage 一等状态——ok？
