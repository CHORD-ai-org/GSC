# SITE_UI_AUDIT.md — 全站视觉交互体检（第 2 轮）与修复

审计日期：2026-11-26。范围：11 个视图逐页截图（`ui-prototype/shots/audit-*.png`）。
触发：创始人「现在还是有很多页面的视觉交互非常糟糕」。
方法：同 UI_PARITY 第 1 轮——逐页截图列具体问题，禁用模糊措辞。

## 已修（本轮直接落地）

| # | 问题 | 修复 | 证据 |
|---|---|---|---|
| P0-1 | raw/objects 页头筛选 chips（全部/用户画像/个人经历/日志/项目）**贴顶截断、无页边距** | chips 行限定 raw/objects 两视图 + padding 14px/36px 对齐页内容 | fix-raw-chips.png |
| P0-2 | overview 待裁决卡**原始 JSON 泄漏**（metadata 提案直接显示 `{"name":"plan","value":"plan"}`） | `humanizeProposalValue`：JSON 展开 name: value、kind 中文化（元信息/打标/归块…）、来源 DET/AGT→检测/Agent；同步接 detail/lightup/spatial 三处 | fix-overview-json.png |

## 待修清单（P1，按刺眼程度）

| # | 页面 | 问题 | 修法 |
|---|---|---|---|
| 1 | sync | **彩色渐变大色块**（紫/绿/粉/橙源卡片+导出卡）与全站极简黑白冲突 | 改白底细边卡+左侧色条（结构主义），保留辨识度 |
| 2 | overview | 统计卡三色渐变底同上 | 同 1（白底+色条） |
| 3 | recently | **空态与数据矛盾**：侧栏 7 个对话，本页说「还没有最近记录」（数据源只含 items） | 数据源扩 conversations/tasks；空态改「暂无条目动态」 |
| 4 | lightup | Identify 按钮 disabled **无原因提示**；Ctrl+Enter 提示中英混杂；面包屑术语神秘（继承/理解/应用/常解/点亮）；无最近 Light Up 历史 | disabled tooltip「输入内容后可用」；文案统一中文；加最近导入列表 |
| 5 | clusters/contexts | 页标题贴页面最上缘（无上 padding） | 统一 page 顶距（对齐 raw 的 14px） |
| 6 | settings | 语言用原生 select 突兀；子导航选中态弱 | select 换分段控件风格；active 态加深 |
| 7 | raw | 类型「Document」裸文本无 chip 样式；工具行右侧下拉拥挤 | 类型文本 chip 化；工具行重排 |

## 根因

各页手写 CSS、令牌散落（UI_FOUNDATION_RESEARCH 路线 B 的令牌收口仍未做）——同一问题
（贴顶/裸文本/色块风）跨页复发就是证据。**令牌收口应作为 P1 修法的前置**，否则逐页补丁无限循环。

## 修复顺序建议

**令牌收口（半天）→ P1-1/2（sync+overview 色块）→ P1-3/4（recently/lightup）→ P1-5/6/7（小修）**
每项修完单独截图贴档（同第 1 轮纪律）。
