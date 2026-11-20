# GSC 界面重构计划 — 大色块设计语言

状态：`EXECUTING`（2026-11-20）· 目标：从「白底 + 细灰线」极简黑白，转为「圆角大色块」的现代彩色块界面（对标 news 卡那块暖色）。
范围：纯前端视觉重构（不改交互逻辑/后端）；零新增依赖，用 `color-mix` + CSS 变量做主题自适应。

## 1. 设计语言（大色块）

- **结构由色块定义，不靠细线**：每张卡/每个区块/侧栏分组都是**圆角填充色块**，去掉白底 + 1px 灰边。
- **配色有轮换（各种）**：一套 6 色调色板（蓝 / 紫 / 粉 / 琥珀 / 绿 / 青）在重复卡片上循环，做到「各种大色块」。
- **柔和不刺眼**：色块是 `color-mix(hue ~18%, surface)` 的柔和填充，文字用 `--ink` 系列，明暗两主题自动适配（暗色块混暗底、亮色块混亮底）。
- **圆角更大**：`radius-lg` 16→18px，新增 `radius-xl` 22px 给大区块。
- **饱和色只做点睛**：色块里的标题条 / 徽标 / 主按钮用饱和色相，其余保持柔和。

## 2. 调色板（tokens.css）

| 名 | 色相 | 名 | 色相 |
|---|---|---|---|
| fill-1 蓝 | #4F7DFF | fill-4 粉 | #EC4899 |
| fill-2 紫 | #7C63FF | fill-5 琥珀 | #F5A623 |
| fill-3 青 | #17C3C3 | fill-6 绿 | #2FBF71 |

加 `--fill-1..6`（已 color-mix 柔化，主题自适应）+ `--hue-1..6`（饱和点睛）。

## 3. 改造点（按面）

| 面 | 现状 | 色块化 |
|---|---|---|
| **侧栏导航** | #FAFAFA 平底 + 灰字项 | 分组色块 / 项色块，激活项饱和块 |
| **总览 stat 卡** | 白卡细边 | 3 张大色块（蓝/紫/粉），数字大 |
| **网格/列表卡** | 白卡细边 | 色块 + 6 色轮换（gridCard/canvasCard/proposalCard 等） |
| **详情页** | 主栏白 + 右栏 rail | 主栏色块 + 右栏属性色块 |
| **集合行** | 透明行 + 下边线 | 行底色轮换 / 色块 glyph chip |
| **同步/导出/供应商** | 白卡 | 色块卡片墙（brandCard/sourceCard/exportCard/providerCard 轮换） |
| **设置/用户** | 无底 block | 区块色块化（settingBlock / userCard） |
| **Start** | 白 composer | composer 大色块 + 快捷动作色 chip |

## 4. 执行顺序

1. **P1 基础**：tokens 调色板 + radius；base.css 兜底（不可继承处）。
2. **P2 核心面**：侧栏 + 总览 stat + 网格/列表卡 + 详情主/右栏（最高可见）。
3. **P3 次要面**：同步/导出/供应商卡墙 + 设置/用户区块 + Start composer。
4. **P4 验收**：两主题截图，核可读性（对比度/文字），修刺眼/发灰处。

## 5. 验收标准
- AC-1：主要卡片/区块都是圆角填充色块（非白底细边）；重复卡片呈现 ≥3 种配色轮换。
- AC-2：明/暗两主题文字对比度可读（正文对比度 ≥4.5:1 目测）。
- AC-3：tsc=0、vitest 全绿（纯样式，不影响逻辑）。
- AC-4：截图归档 ui-prototype/shots/cb-*.png，与「白底细线」旧观感可辨。

---

## 6. 追加执行：圆角化 + 去说明文字（2026-11-20）

用户补充指令：将各个矩形组件都变成圆角，去掉一切多余的说明文字。

**圆角系统**
- tokens：radius-sm 8→13、radius-lg 18→22、radius-xl 24→30、新增 `--radius-pill`。
- 按钮/输入框全部胶囊化（999px）：primary/secondary/download/danger/search/select/settingInput/chipButton/commandInput。
- 块级组件大圆角（radius-lg）：listRow / rawContent / reviewRow / docsToc / menuPop / chipMenu / slashMenu / checkLine / sourceErrorCard。
- 小方块更圆：iconButton→50%/胶囊、cardGlyph、gridCardGlyph→9px、intake→20px、accept/reject→12px、rowActionButton→10px。

**去说明文字**（删 50+ 处；保留空状态/加载/错误反馈 + 表单字段标签）
- 全删：页面副标题 pageSub（各页 `.sub`）、卡片描述 brandDesc/providerDesc/exportDesc、步骤 stepLabel、Start valueSub/overviewQuestion、菜单 chipOptionDesc/slashDesc。
- 解释性 hint 删：sync.wallSub/v1Only、export.sub、trash.desc、settings.account/conn/visitHint、model.keyHint + model.current、user.profileHint、detail.rawHint/stanceHint/clusterNote/multiHomeHint/auditHint/explicitOnly、tags.scopeHint、activity.hint、newsAdmin.desc。
- 结构节点删：底部 KeyHintBar 整条（组件 + 4 处调用 + import）、detail relationSummary 关系摘要、model 页底部配置说明。
- tags.empty 文案精简：「暂无标签。标签维度受控定义，取值自由。」→「暂无标签。」
- 保留：空状态（noRefs/noContexts/empty/loading…）、错误反馈、表单字段标签 settingCaption、数据统计。

**验收**
- tsc=0；vitest 93/93 全绿（3 个 server 用例超时系并行资源竞争假失败，串行高超时复跑全过，非逻辑破坏）。
- 截图 ui-prototype/shots/cb-{start,raw-list,raw-detail,settings,overview,recently}.png：composer / 导航 / 按钮 / 输入框 / 列表行 / 内容块 / 属性块均圆角或胶囊，副标题 / 描述 / 提示 / 快捷键条已消失。截图脚本 `scripts/shot-cb.mjs`（跳过 onboarding、中文文案导航）。
