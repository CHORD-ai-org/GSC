# GSC 质感对标与优化计划 — 逐页 vs 大厂（2026-11-20 二轮）

对标：ChatGPT / Grok / Linear / Notion / Stripe。基准截图 `ui-prototype/shots/au-01…14`。
一轮差距（INTERACTION_UX_PLAN）已清掉表单感；本轮差距集中在**数据质感、双语混排、微反馈**。

## 1. 逐页对比

| 页面 | 对标 | 分 | 差距（按严重度） |
|---|---|---|---|
| 开始 | ChatGPT | 8 | 高：输入框 placeholder 是英文 `Ask anything`；模型 chip 显示 `Deepseek` 但真实配置是 MiMo（假数据感）。中：快捷入口三个松散悬浮，无 hover 聚合。低：两侧留白大 |
| 总览 | Linear | 7 | 高：待审队列 3 张卡同文案 `missing source_label`（脏数据）；「最近更新」标题全是 SVG 源码片段。中：行时间整列重复 `5 小时前`；`METADATA` 全大写标签突兀 |
| 最近 | Notion | 6.5 | 高：整页脏标题。中：每行挂 `修改 · 5 小时前` 重复噪点；`DO` 图标码无辨识度 |
| 原始信息 | Linear | 6.5 | 高：脏标题铺满（`<path class="hair">`…）；每行 `Document · lightup:file` 重复。中：无 hover 快捷动作、无快捷键提示条 |
| 原始详情 | Notion | 7 | 高：kicker 一整行 UUID `raw_3cf375e7-ffbf…`；`Back` 英文。中：正文框是 SVG 源码；两个空区块（引用/上下文）连排占屏。低：Meta Tags 表单三件套裸露 |
| 对象详情 | Notion | 7 | 同详情页问题；`配对原文` 引用的又是 UUID 标题 |
| 关联组/上下文 | Linear | 7 | 中：副标题英文 `Groups of related information…`；行密度低、右 2/3 空 |
| 同步与导出 | Stripe | 8.5 | 全站最强页。中：`items: 91 · contexts: 8` 裸 mono 行像调试输出；已连接卡红字报错 `GitHub API HTTP 401` 裸露无引导 |
| 设置-模型 | Stripe | 8.5 | 低：「当前生效」一行超长 mono 换行；模型输入框是单个裸 input |
| 文档 | Stripe docs | 5.5 | 高：纯 bullet 列表无版式层级，像 README；快捷键 `ctrl o` 小写不像按键。中：无目录锚点、无代码块视觉 |

## 2. 全局差距（杀伤力排序）

1. **脏数据铺屏** — 测试残留（`Smoke concept`、`missing source_label`、SVG 片段标题）毁掉一切设计。大厂没有一个界面会被 demo 数据拉垮。
2. **双语混排** — `Back`/`Ask anything`/`ctrl o`/英文副标题与中文 UI 并存。
3. **假状态** — Composer 显示 `Deepseek`，设置里生效的是 `mimo-v2.6-pro`，两处不一致 = 不可信。
4. **UUID 上屏** — 详情 kicker 整行 ID。
5. **重复时间/类型列** — 整列同值应折叠为分组头。
6. **微反馈缺失** — 列表无 hover 快捷动作、无底部快捷键提示条、按钮无按压反馈。

## 3. 优化计划（P0→P2）

### P0 数据与一致性（半天，质感提升最大）
- 清库：删 Smoke 测试残留，灌 8–10 条人话样例（标题即内容摘要，如「Chunking 优于长上下文的原因」）
- Composer 模型 chip 读真实 llmConfig（显示 `mimo-v2.6-pro` + MiMo logo），不再写死假列表
- `Ask anything` → 中文 placeholder（i18n key）
- 验收：任何页面截图里不出现 `Smoke`/`missing source_label`/`<path class=`

### P1 双语与 ID 治理（半天）
- `Back`→`返回`；关联组/上下文英文副标题转中文（补 i18n）
- 详情 kicker 换面包屑（类型 › 标题），UUID 移入右栏「更多」
- 文档页：快捷键改 `<kbd>` 视觉、分节排版加锚点目录、代码类内容入代码块
- 行时间去重：同一天只在分组头显示一次
- 验收：grep 全站残留英文界面词 = 0；详情页首屏无 UUID

### P2 微交互打磨（1 天）
- 列表行 hover 出快捷动作（编辑/打开/复制链接），底部快捷键提示条 `↑↓ 导航 · ↵ 打开 · esc 返回`
- `DO/CO/CLU/CTX` 字码换图形图标（复用 Sidebar 图标集）
- 同步页报错卡：错误文案 + 「重试」按钮 + 帮助链接
- 总览 `METADATA` 标签改正常大小写徽章；空区块（引用/上下文）收进一行摘要
- 验收：hover 截图对比；快捷键提示条全列表页可见

## 4. 不做

- 不换视觉基底（tokens/字体不动，当前基调已达标）
- 不动 Light Up 编辑器
- 不引入组件库

## 5. 门槛

P0 完成前不再新增功能页——脏数据状态下任何新界面都会被拖垮。
