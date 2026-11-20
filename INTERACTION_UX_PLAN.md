# GSC 交互优化计划 — 去表单化，对齐 ChatGPT / Grok 产品体感

状态：`EXECUTED`（2026-11-20，P0–P5 全部执行完毕，截图归档 ui-prototype/shots/ux-*.png 与 dark-ux-*.png）
范围：纯前端，不改后端 API，不引入组件库（保持零依赖）

---

## 1. 诊断：现状逐页（界面原话）

| 页面 | 现在的界面 | 体感 |
|---|---|---|
| Sync「连接信息源」 | 一行排开：`github ▾` `owner/repo` `issues` `访问令牌…` `连接` | 后台管理系统的添加表单 |
| Sync「已连接的源」 | 黑方块 `G` · `acme/widgets · github` · `范围 issues · 状态 connected · 上次同步 从未`，右侧 `手动 ▾` `Sync now` `暂停` `断开` | 数据库行 + 四个常驻裸按钮 |
| Settings → Model | `PROVIDER BASE URL` / `MODEL` / `API KEY` 三个裸输入框 + `保存` `测试连接` | 配置文件编辑器 |
| Settings → General | 工作区名输入框 + 语言下拉 + 两排 pill | 表单页 |
| 原始信息详情 | `原始内容` `来源` `基本属性` `Meta Tags` `被哪些引用` `属于哪些 Context`，一屏 kv 行连排到底 | 数据库记录查看器 |
| Overview 下半 | `REVIEW QUEUE` / `YOUR CONTEXTS` / `META TAGS` 三段同款灰字行 | 报表 |
| 品牌呈现 | GitHub = 黑方块 `G`；Notion / Drive / X 只有文字；模型下拉 `Deepseek` `Rym` 纯文字 | 没有产品质感 |
| 空状态 | `暂无来源。` `暂无标签。` 一行灰字 | 没有引导 |
| 动作反馈 | 保存/连接后只有一行小字提示 | 没有反馈感 |

一句话结论：全站不是丑，是**把字段直接摆上屏**——输入框排队、kv 行连排、品牌缺席、动作无反馈。

## 2. 对标：ChatGPT / Grok 的做法 → GSC 落点

| 对标做法 | GSC 落点 |
|---|---|
| 对话框是唯一主入口 | Start composer 保持主位；新建/连接/打标签一律走**点击后滑出的右侧面板**，不再开整页表单 |
| 集成页是品牌卡片（logo + 名称 + 一句话 + 状态） | Sync 改品牌卡片墙 |
| 设置即时生效 + toast，没有「保存」按钮 | Settings 全部防抖自动保存 + `已保存` toast |
| 模型/来源选择带官方 logo | Composer 下拉、Model 设置、Sync 全部带品牌 logo |
| `/` 命令 + 全局命令面板 | Composer 内 `/` 唤起命令；`Ctrl+K` 跳页/搜索/执行 |
| 空状态有引导和一个明确动作 | 每个列表空态 = 一句话 + 一个主按钮 |
| 过程有流式/骨架/loading 反馈 | toast、骨架屏、按钮三态统一 |
| 键盘可达、动效短促 | focus 环全站复核，转场 ≤200ms |

## 3. 总原则（执行时逐条对照，P5 体检也按这五条量）

1. 一屏最多一个裸输入框区，且必须分步或带示例 placeholder。
2. 有品牌的地方必须有 logo。
3. 没有「保存」按钮，只有「已保存」反馈。
4. 行内动作悬浮/收进 `···`，不常驻一排按钮。
5. 空状态永远给下一步动作。

## 4. 阶段计划

> 执行记录（2026-11-20）：P0–P5 全部完成。P1 中发现 `···` 菜单被 `.page` 滚动容器裁剪，改 fixed 定位修复；P2 截图脚本曾误触发自动保存覆盖 LLM 配置，已恢复 MiMo 配置（后续脚本注意不点 Model 页 provider 卡）。表单体检 4 处命中全部判定 PASS/范围外（Light Up 不动）；品牌体检 6/6 logo 两主题覆盖。

### P0 品牌资产 + 基础组件
- 下载第三方 logo 入 `public/brands/`：GitHub、Notion、Google Drive、X、Xiaomi MiMo、DeepSeek（SVG；官方媒体包优先，备选 simple-icons 单色可染；`public/brands/LICENSE.md` 记来源与许可）
- 组件 `BrandLogo`（kind 取图、统一 20px、暗色可染色）
- 组件 `Toast`、`EmptyState`、`CardShell`
- 验收：六个 logo 两主题渲染正常，截图归档。

### P1 Sync 连接流程产品化
- 「连接信息源」→ 品牌卡片墙：GitHub / Notion / Google Drive / X，每卡 = logo + 名称 + 一句话
- 点卡片 → 右侧滑出面板分步填字段（仓库 → 范围 → 令牌），字段带示例 placeholder
- 「已连接的源」→ 卡片网格：logo、状态点（绿/黄/红）、上次同步相对时间；`Sync now / 暂停 / 断开` 收进 `···` 悬浮菜单
- 验收：连接全流程截图；该页常驻裸按钮行 = 0。

### P2 Settings 即时化 + Model 卡片
- Model 改 provider 卡片三选一（MiMo / DeepSeek / 自定义 OpenAI 兼容），选中才展开字段
- API Key 显示 `已配置 tp-c…2qm6` 徽标，不再裸输入框常驻
- 「测试连接」即时 ✓/✗ 动效 + 耗时
- 全设置页防抖自动保存，顶部 toast `已保存`；「保存」按钮清零
- Composer 模型下拉带 logo + 一行描述
- 验收：任意设置改动 1 秒内出 toast；截图对比。

### P3 详情页与 Overview 重排
- 详情页：主栏只放「内容卡」正文；右侧属性栏放来源/时间/状态徽标；Meta Tags 变 chips，点开行内编辑；低频 kv 折叠进「更多」
- Overview：顶部 3 张数字卡；Review Queue 卡片带行内 ✓/✗ 按钮；Meta Tags 变标签云 chips；三段同款 listRow 取消
- 验收：详情页首屏 kv 行 ≤6；Overview 同款 listRow 段 ≤1。

### P4 命令面板 + 空态 + 微反馈
- `Ctrl+K`：搜索条目 / 跳页面 / 执行命令（新建、连接源、导出）
- Composer 内 `/` 命令：`/capture` `/connect` `/export` 等
- 全站空态补一句话 + 主按钮；按钮 loading 三态；列表骨架屏
- 验收：Ctrl+K 三类操作可达；每个列表页空态截图。

### P5 体检与回归
- 表单体检：全站连续裸输入框 ≥3 的区块 = 0
- 品牌体检：六个 logo 出现处覆盖率 100%
- 全页新旧截图对照入 `ui-prototype/shots/ux-*.png`（两主题）
- 测试全绿

## 5. 不做

- 不引入 UI 组件库（零依赖不变）
- 不改后端 API 与数据模型
- 不动 Light Up 编辑器既有体验

## 6. 开放问题

1. Start 新闻面板保持纯文本流，还是也卡片化？
2. 命令面板要不要带「向 Agent 提问」入口？
