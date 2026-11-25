# SIDEBAR_PLAN.md — 侧栏更新计划（G7 配套）

Status: `DECIDED` — 2026-11-25，已执行（D-109；黄点/真 ChatView/置顶动作随 G7）。依据：创始人批注 #3（「Sidebar 也有 UI 的更新，到时候记得
制定相关计划；注意有两个"最近"，上面的是全类型，而下面的"最近"专指对话」）+ 原型侧栏截图。
归属：G7 Step 9（数据源依赖 G7 Step 4 的 conversations API）。

## 1. 原型结构 vs 现状（delta）

| 分区 | 原型 | 现状 | 动作 |
|---|---|---|---|
| 通用 | 开始 / 总览 / **最近**（全类型） | ✅ 同 | 语义标注（全类型） |
| 信息 | 原始信息 / 结构化对象 | ✅ 同 | 不动 |
| 组织 | 关联组 / 上下文 | ✅ 同 | 不动 |
| 同步与导出 | ✅ | ✅ | 不动 |
| **置顶** | 「置顶 v」可折叠区（chevron） | ❌ 无 | **新增** |
| **最近（对话）** | 会话列表（行=对话语义标题） | ❌ 无 | **新增** |
| footer | GSC Workspace·本地账户 / 设置 / 文档 | ✅ 同 | 不动 |

## 2. 两个「最近」语义（批注点名，不合并）

| | 顶部「最近」 | 底部「最近」 |
|---|---|---|
| 时间线 | **信息时间** | **对话时间** |
| 行= | 条目（chunk/object/提案痕迹） | 一次工作对话（如"智能床垫"项目的数据整理） |
| 数据源 | items（现有 RecentlyPage） | conversations（G7 Step 4 新表） |
| 点击 | 打开条目详情 | 打开对话工作面（ChatView） |

## 3. 新增组件

- **置顶区**：`PinnedSection`——列表行=已置顶条目/对话（置顶动作后置，本期先支持数据面），
  chevron 折叠态存 UiPrefs。
- **对话「最近」**：`ConversationList`——行：对话语义标题（D-107 titler 生成）+ 未完结
  `awaiting_user` 黄点提示；active 行高亮（原型：选中项深色底）。
- 结构复用现有 sidebar 分组样式（`nav.*` 文案族 + SectionLabel）。

## 4. 交互细节（原型）

- 分组标题小号大写（GENERAL/INFORMATION/ORGANIZATION 样式一致）。
- 「置顶 v」：标题+chevron，折叠态持久（UiPrefs）。
- 对话列表最多显示 N 条（8），「查看全部」后置。
- active 态：当前打开的对话/页面行高亮（现有 active 样式延伸）。

## 5. 分步（挂 G7 Step 9，可独立提前）

1. `PinnedSection` 静态渲染 + 折叠（UiPrefs 持久）。
2. conversations API 就绪（G7 Step 4）→ `ConversationList` 接数据。
3. 双「最近」语义标注 + 点击路由（顶部→RecentlyPage / 底部→ChatView）。
4. awaiting_user 黄点 + active 高亮。

**验收**：两「最近」各司其职（点顶部开条目、点底部开对话）；置顶可折叠且刷新后保持；
对话行黄点=有停点任务。

## 6. 边界

- 不做：置顶管理页/排序拖拽/会话搜索/分组自定义（后置）。
- 文案新增 `nav.pinned`（置顶）/`nav.conversations`（最近·对话）两键，走 strings.ts。
