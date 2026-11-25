# LOGIN_REDESIGN_PLAN.md — 登录页改版：OpenAI 式科技极简（去手绘）

Status: `EXECUTED` — 2026-11-25（D-108）。双版并交：居中窄卡（默认）+ 左右分栏（`?layout=split` 备选），
注册收据=极简回执卡、wordmark=纯文字（取计划默认①③）。四景实拍 `ui-prototype/shots/login-*.png`。
口径：**只改登录页**（`src/pages/auth/LoginPage.tsx` + `login.module.css`）。应用内手绘
sketchbook 语言（d-r-a-w 遗产）**不动**——登录页是门面，进门之后照旧。

## 0. 现场（已核对到行）

| 事实 | 证据 |
|---|---|
| 登录页手绘化到底：纸张 Sheet、按钮 SketchFrame、输入 SketchUnderline、注册收据 ReceiptPrinter（热敏打印+条形码+撕纸） | `LoginPage.tsx:115,149,161,173-187` 五类手绘件 |
| 逻辑层干净可复用：表单校验、mode 切换、OAuth 行为（CHORD 本地会话 stand-in）、finishWith（listUsers/createUser）、onAuthed 接口 | `LoginPage.tsx:26-107` |
| 样式全在独立模块 | `src/pages/auth/login.module.css` |
| 双主题基础设施已有（prefs THEMES） | `src/lib/prefs.ts` |

## 1. 任务卡（AGENTS.md §3）

- **Purpose**：门面符合产品要的「科技极简」气质——干净排版、克制单色、零手绘；进入工作区
  后保持既有 sketchbook 语言不变。
- **Scope**：LoginPage 视觉重构（结构+样式+微交互）；注册成功呈现改极简回执卡；双主题。
- **Interacts with**：`LoginPage.tsx`、`login.module.css`、`GscLogo`（可选 wordmark 化）、
  新 `login.module.css`（重写）；**不再 import** SketchFrame/SketchUnderline/ReceiptPrinter。
- **Does not own**：登录/注册/OAuth 逻辑（一行不改）、应用内 sketch 风格、OAuth 真接入、
  ReceiptPrinter 组件本身（保留在组件库，只是退出登录链路）。
- **User flow**：打开 → 居中窄卡（wordmark、标题「Sign in」、OAuth 四键、分隔线、
  邮箱/密码、全宽黑底 CTA、切换注册）→ 注册成功 → 极简回执卡（姓名/身份/激活码 + Continue）→ 进工作区。错误行内淡入。
- **Minimum implementation**：login.module.css 重写 + JSX 去手绘件 + 回执卡替换收据。
- **Test method**：CDP 双主题截图（light/dark 各一）+ 表单流走查（校验错误/模式切换/
  OAuth notice/注册→回执→Continue）；`npx vitest run` 全绿（现有套件无登录视觉测试，新增 0
  破坏即可）。

## 2. 视觉规范（OpenAI 式科技极简）

| 要素 | 规范 |
|---|---|
| 布局 | 居中窄卡 380–420px，垂直居中，卡片无边框（仅留白分区）；页底一行灰字注脚 |
| 字体 | 系统 sans 栈（-apple-system/Segoe UI/Inter），标题 24–28px/-0.02em，正文 14px，行高松弛 |
| 色 | light：白底 #fff、文字 #0d0d0d、灰阶 #737373/#e5e5e5；dark：#212121 底/#ececec 文字。**唯一强调色=CTA 黑底白字**（dark 下反白），无渐变无插画 |
| 输入 | 圆角 8–10px、内距 12–14px、1px #e5e5e5 描边、focus 黑描边+2px 淡环；label 上置小字 |
| OAuth | 描边圆角按钮 + 文字（可选单色 provider 图标后补），4 键纵排或 2×2 |
| CTA | 全宽、圆角 10px、黑底白字、hover 微亮（opacity .9）、press 微沉 |
| 动效 | 仅 120–180ms 微交互（hover/focus/错误淡入），无手绘描边动画 |
| 品牌 | 顶部 wordmark「GSC」（几何/纯文字），手绘 GscLogo 不进登录页 |

## 3. 批次

| 批次 | 内容 | 出口 |
|---|---|---|
| A 视觉重构 | login.module.css 重写 + JSX 结构替换（去 SketchFrame/Underline/Grip/Sheet）+ 双主题 | CDP light/dark 截图各一，表单可用 |
| B 注册回执 | ReceiptPrinter → 极简回执卡（姓名/Email/Identity/激活码 + Continue） | 注册→回执→Continue 全链走查 |

## 4. 待决策（3 个，`PROPOSED`，附建议）

1. **注册收据**：建议极简回执卡替代热敏打印机（打印美学=手绘家族，与新门面冲突；ReceiptPrinter
   组件保留在组件库供演示件用）；备选：保留收据（风格冲突）。
2. **布局**：建议居中窄卡（OpenAI 同款）；备选：左右分栏（左品牌语句右表单，更「产品」但偏离参照物）。
3. **Logo**：建议纯文字/几何 wordmark；备选：保留线稿 GscLogo（半手绘残留）。

## 5. 不做

应用内 sketch 语言 · OAuth 真实接入 · 注册逻辑改动 · 深色页手绘素材适配 · 动画库依赖。
