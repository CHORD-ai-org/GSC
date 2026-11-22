# RECEIPT_DEMO_PLAN.md — 注册流程发票演示（Receipt Printer，手写实现）

> Task card per `AGENTS.md` §3. Created 2026-11-22 before coding.
> 组件为**自写**（用户 2026-11-22：「不要API Key，你自己写效果」）——不走 React Bits Pro
> registry 安装、不需要 REACTBITS_LICENSE_KEY、零新依赖（React + CSS Modules，符合 D-005）。
> 效果对标 React Bits Pro `receipt-printer` 的公开行为描述：热敏打印机、出纸动画、可撕下的收据。

## 1. Purpose

注册流程结束后，用一台热敏打印机打出一张「注册收据」——把刚创建的 GSC 身份（姓名、邮箱、
时间、序号）印在可撕下的收据纸上。注册确认从一行提示变成一个可感知的物件。

## 2. Scope

- 自写 `ReceiptPrinter` 组件：出纸动画、拖拽撕下（flick 快速撕）、锯齿撕边、barcode、
  指示灯、reduced-motion 降级。
- LoginPage「Create an account」（注册）表单提交成功后插入收据打印步骤，撕下/Continue
  后进入工作区。

**不包含：** 登录（sign-in）路径、OAuth（CHORD）路径、Onboarding、后端改动、
React Bits Pro / license key / Tailwind / 任何新依赖。

## 3. Interacts with

- `src/components/ReceiptPrinter.tsx` + `src/components/receipt.module.css`（新建）。
- `src/pages/auth/LoginPage.tsx` — `create` 模式提交成功后的流程（`finishWith` 返回 user，
  注册路径先进收据步骤再 `onAuthed`）。
- `src/pages/auth/login.module.css` — 收据步骤布局补充。
- `src/app/App.tsx` — `onAuthed` 契约不变（userId, name），无需改动。

## 4. Does not own

- 身份/账户语义：`api.createUser` 与 CHORD 登录语义不动，收据仅为演示，不是票据/发票凭证。
- 计费、支付、税务字段不存在也不引入。
- 注册流程的验证规则（email/password 校验保持现状）。

## 5. User flow

1. 登录页 → 「Create an account」，填 Name / Email / Password → 「Create account」。
2. 表单区切换为收据打印步骤：打印机指示灯闪烁、收据从出纸口卷出（打印姓名、邮箱、身份 id、
   时间、序号、barcode）。
3. 上拖撕下收据（拖过阈值或快速上甩即撕下，纸片飞出），或点「Continue」。
4. 进入工作区（随后按现状进入 Onboarding）。

## 6. Minimum implementation

- `ReceiptPrinter` 以 `lines` 自定义收据内容；`autoplay={false}`（注册场景由用户撕下）。
- 撕下或点 Continue → `onTear` → 调用现有 `onAuthed(userId, name)`；无新 API、无新状态持久化。
- Sign-in / OAuth 模式行为完全不变。

## 7. Test method

- `npm run check`、`npm run lint`、`npm run test`、`npm run build` 全过。
- headless Chrome 1440×900：注册 → 收据打印渲染（含姓名/邮箱），Continue → 进入应用。
- 回归：sign-in 模式直接进入工作区（无收据步骤）。
