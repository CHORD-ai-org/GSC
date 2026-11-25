# CONNECTIONS_VISUAL_PLAN.md — Settings › 连接 页视觉优化

Status: `EXECUTED` — 2026-11-25「开始执行」（D-109，两待决策取默认：工具 chip 行 + 客户端标签页）。
实拍验收 `ui-prototype/shots/mcp-settings.png`；视觉复审修 2 处（MCP 标题收短、工具描述 tooltip）。
范围：Settings › 连接（Token 管理 + MCP 接入卡片 + Claude Code/Codex 提示块）。只动视觉与
信息层级，不动功能逻辑（token CRUD、片段生成、工具清单数据源）。视觉语言对齐登录页刚定的
科技极简（LOGIN_REDESIGN_PLAN 的 tokens：灰阶 + 单点强调 + 10px 圆角 + Inter + 微交互）。

## 0. 现场（视觉问题清单，对照实拍 ui-prototype/shots/mcp-settings.png）

| # | 问题 | 现状 |
|---|---|---|
| 1 | **无分区感**：三块（Token / MCP / 提示）竖排平铺，标题小、无边界，扫读时层级全平 | 通用 settingBlock 顺序堆叠 |
| 2 | **代码块裸**：配置片段用 `<pre>+settingValue`，无代码块质感（无底色/无行号感/复制按钮孤立在下方） | McpSection 片段区 |
| 3 | **工具清单挤**：9 行「名字+读写+长描述」一行流，描述换行破坏行节奏 | listRow 平铺 |
| 4 | **表单行糙**：addRow 两输入+下拉等宽无标签，placeholder 当标签用 | Token 创建行 + MCP 输入行 |
| 5 | **徽章缺失**：token scope（read/rw）、工具只读/写都是纯文本，无 chip 感 | rowType 文本 |
| 6 | **信息重复**：底部「CLAUDE CODE / CODEX」硬编码块与 MCP 卡内容重叠 | connClaude 提示块 |
| 7 | **语言未对齐**：与新登录页（Inter/灰阶/圆角/微交互）不成一家 | 全页 |

## 1. 任务卡（AGENTS.md §3）

- **Purpose**：连接页成为「给 agent 接线的控制台」——扫一眼分清 Token / 接入配置 / 工具能力
  三区，复制即走。
- **Scope**：两列布局重构 + 组件精修（代码块、徽章、表单、空态）+ 登录页 tokens 引入 +
  删重复提示块；实拍验收。
- **Interacts with**：`src/views/pages.tsx`（TokenSection/McpSection JSX）、
  `src/views/views.module.css` 或新 `src/pages/settings/connections.module.css`、
  `src/lib/strings.ts`（少量标签词）。
- **Does not own**：token/MCP 功能逻辑、API、工具注册表、应用内其余 settings 分区、手绘语言。
- **User flow**：进 设置 › 连接 → 顶部页标题+一行导语 → 左列「访问令牌」（创建行+token 卡片列）
  与「配置片段」（客户端标签页切换 + 代码块 + 复制）→ 右列「工具面」（9 个工具 chip 行）→
  全程一眼可辨 read/rw、只读/写。
- **Minimum implementation**：两列 grid + 代码块组件化（底色/mono/复制悬浮）+ 徽章 chip + 表单标签化。
- **Test method**：CDP 实拍（1440×900 + 1280 折叠各一）；`npx vitest run` 全绿（词表覆盖测试
  自动护航）；tsc=0 lint=0。

## 2. 视觉规范（沿登录页 tokens）

| 要素 | 规范 |
|---|---|
| 布局 | 页内两列 grid（左 58% / 右 42%，<1100px 单列）；每列内 section 卡片（1px line 边框、12px 圆角、20–24px 内距） |
| 分区标题 | 12px/600 大写间距标题 + 右侧计数/状态徽章；导语 13px 灰 |
| 代码块 | bg-soft 底 + 10px 圆角 + mono 12.5px + 右上角悬浮 Copy（hover 显现）+ 超宽横向滚动 |
| 徽章 chip | scope：read=灰描边、rw=实心深底；工具：readOnly=灰 chip、write=描边 chip（11px/500） |
| Token 行 | 卡片化：名称(15px/550) + chip + userId mono + 日期灰 + 右侧 revoke 文字钮（hover 转红） |
| 表单 | label 上置 12px 灰（不用 placeholder 顶标签）；输入套登录页 .input 规范（10px 圆角/focus 环） |
| 空态 | 「还没有 token」+ 一行引导文案，灰字居中留白 |
| 微交互 | Copy 成功 → 按钮瞬时「Copied ✓」120ms 过渡；卡片 hover 边框微深 |

## 3. 批次

| 批次 | 内容 | 出口 |
|---|---|---|
| A 结构 | 两列 grid + 三 section 卡片化 + 删 connClaude 重复块（文案并入 MCP 卡导语） | 1440×900 实拍，层级清晰 |
| B 组件 | 代码块（悬浮 Copy）+ 徽章 chip + token 行卡片 + 表单标签化 + 空态 | 实拍对照 §0 七问题逐条消除 |
| C 验收 | CDP 实拍 2 尺寸 + 中文截断/长名 token 边界走查 | 截图入 ui-prototype/shots/ |

## 4. 待决策（2 个，`PROPOSED`，附建议）

1. **工具面形态**：建议 9 工具改「chip 行」（名称 chip + 读写徽章 + 描述一行截断、hover 展开全称）
   ——高密度但有序；备选：保留平铺行（改动最小）。
2. **客户端切换**：建议片段区加 4 客户端**标签页切换**（claude-code/codex/opencode/workbuddy，
   现为下拉）——一眼见全部目标；备选：保留下拉（省空间）。

## 5. 不做

功能逻辑改动 · 新 API · 动画库 · 深色专属插画 · 其余 settings 分区视觉（后续另立）。
