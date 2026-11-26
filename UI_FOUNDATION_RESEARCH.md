# UI_FOUNDATION_RESEARCH.md — 对话流是否需要底层框架升级（调研结论）

调研日期：2026-11-25。触发：创始人「生成的页面在中央；现在的 UI 总是差点意思；调研是否需要
底层框架的优化」。

## 1. 现状盘点（证据）

- 技术栈：React 19 + Vite + **纯 CSS Modules**；**无** tailwind/shadcn/radix/framer-motion/MUI。
- UI 资产：`src/components/` 约 15 个手写组件；`views|app|chat` 各自 `.module.css`；
  CSS 变量已有雏形（`--ink/--line/--bg-surface/--ink-3` 等）散在各模块。
- 对话流 UI（G7）：ChatView/TaskCard/FlowPanel 混用 module class + 内联 style 对象——
  间距/圆角/色值三处重复定义，正是「总是差点意思」的来源之一。

## 2. 三个候选路线

| 路线 | 内容 | 成本 | 结论 |
|---|---|---|---|
| A. 换框架（Tailwind/shadcn/MUI） | 全面重写样式层 | 高（全站重写、审美冲突、与 CSS Modules 并存两套体系） | **不建议** |
| B. 设计令牌层 + 少量原语（无新依赖） | 令牌收口 + 原生 `<dialog>` + CSS transition | 低 | **✅ 推荐，立即做** |
| C. 引 Radix Dialog / framer-motion | 无障碍/焦点/动画交由库 | 中（1-2 个轻依赖） | **挂起**：出现多模态堆叠/焦点管理事故再引 |

## 3. 推荐路线 B 的三件事

1. **令牌收口**：`src/styles/tokens.css` 定义语义变量（surface/sunken/accent/info/danger/
   radius/间距刻度），各 module.css 只引用不定义——一次调整全局生效（「差点意思」的最大杠杆）。
2. **原生 `<dialog>` 模态原语**：FlowPanel/命令面板等居中模态统一用 `<dialog>`（React 19 原生
   支持 showModal）——免费获得 Esc 关闭/焦点陷阱/滚动锁定，**零依赖**。
3. **CSS transition 微动效**：stepper 切换 150-200ms fade/translate、进度条过渡——纯 CSS，
   不引动画库。

## 4. 可证伪触发器（何时升级到 C）

- 出现多层模态堆叠/焦点回归 bug 且手写修复超过两次；
- 需要系统级多主题（暗色全站切换）且令牌层不够表达；
- 组件复用请求跨 ≥3 个页面且形态一致。
→ 触发时优先引 **Radix Dialog**（仅行为原语，不带样式），仍不引 Tailwind。

## 5. 已落（本轮）

- 生成页面（FlowPanel）**居中模态化**：`min(760px, 92vw)`、圆角 16、边框+阴影——
  见 `flow-centered.png`。
- 令牌收口与 transition 列入 UI_PARITY 后续优化（不阻塞 benchmark）。
