# LIGHT_UP_INTERACTION_SPEC.md — 交互规格与状态机

> 每个交互标注能力来源：【现】existing contract /【前】frontend-only /【后】backend extension（本次为零）/【缓】deferred。

## 1. Capture — 统一 Composer【前】

- 大幅留白文本区（自动增高），占位：「把信息带进 GSC…」。
- 底部一行轻量 affordance：粘贴剪贴板 · 导入文件 · URL 展开 · 来源标签。
- **拖放**：拖文件进 Composer 区域 → 边框+提示响应；松手即读入文本（`.txt/.md/text/*`）。【前】
- **Ctrl+O**：全局已有；在 Light Up 内等价于导入文件。【现】
- **URL**：点 URL 展开一行输入 →「预览」→ `POST /api/ingest/url`【现】。抓取结果进入文本区并显示一条 **预览横幅**：「来自 <url> 的内容 —— 尚未进入 GSC」；横幅在入库动作后消失。预览≠持久化。
- **状态可见性**：文本区右上角实时计数「N 字 · M 段落」；「Identify Information」主按钮在无内容时禁用。
- 手动模式（NewForm）保留为 Composer 下方的折叠入口「手动逐字段创建」。【现】

## 2. Understand — 真实处理态【前】

点「Identify Information」后：

1. 阶段标签依序亮起：Reading Source → Identifying Information → Establishing Semantic Identity → Preparing Review。每步对应真实工作（归一化→切块→命名→构 Sheet）；规则管线毫秒级完成，总展示 ≈ 500ms，**不做假百分比**。
2. Agent 建议（可选按钮「Ask Agent for names」）独立于阶段流，spinner 期间显示「Contacting model…」，失败给 Retry。【现 /api/agent/propose】
3. 错误态：URL 抓取失败/无切块 → 就地错误行 + 保留输入内容（不清空）。

## 3. Shape — Semantic Object Sheet 与三视图

### 3.1 Sheet 结构（自上而下）

1. **语义名**（大字号，inline 可编辑；机器来源标 machine 芯片，用户改过后标 confirmed 芯片）。
2. **元数据行**：信息类型（select）· 状态 · provenance（来源标签、作者/locator 视类型而定）。
3. **原文摘录**（等宽字型，original 芯片；最多 8 行可展开）。永不被语义名替换。
4. **Meta Tags**（维度+取值的待入库行，可增删）【前，入库时走 /api/tags/values【现】】。
5. **审阅动作**：采纳 ✓ / 编辑（展开完整内容）/ 拒绝 / 延后。

### 3.2 三视图（Shape 区内 tab）

- **Overview**：真实计数（N 个信息单元 · 各类型分布 · 来源数），无编造分数/质量指标。
- **Chunks**：Sheet 集合，逐张可展开编辑。
- **Source**：原始输入全文（归一化前原文）。**选中 Sheet ↔ 高亮对应原文段**：切块时记录 offset 区间【前，增强 segmentText】；映射不到原文的片段显式显示「无精确引用」，**不造假高亮**。合并块高亮跨段区域；拆分后各块各自高亮。

### 3.3 三态视觉

| 状态 | 表达 |
|---|---|
| 原文 | 灰 chip「原文」+ 等宽字型 |
| 机器建议 | 紫 chip「机器」+ 紫点前缀 |
| 用户修改/确认 | 绿 chip「已确认」+ 编辑后自动打标 |

## 4. Curate — 策展操作【前】

| 操作 | 行为 | 状态迁移 |
|---|---|---|
| 采纳 | 纳入入库集 | *→accepted |
| 拒绝 | 移出入库集，行保留可恢复（红色边注「已拒绝 · 恢复」） | *→rejected |
| 延后 | 移出入库集但保留在「待定」区；Illuminate 提示未决 | *→deferred |
| 编辑语义名/内容/类型 | inline 就地改，无弹窗；改动打「已确认」标 | *→edited |
| 批量采纳 | 顶栏「Accept all N」+ 勾选批量条 | 多行→accepted |
| 合并 | 勾选 ≥2 张 →「Merge」：内容按序拼接、语义名取首张、offset 取并集 | 两行→一行 |
| 拆分 | Sheet 编辑态内「Split at cursor」：按光标处段落边界拆两张 | 一行→两行 |

状态机：`proposed → (accepted | rejected | deferred)`，rejected/deferred 可回 proposed；edited 是 accepted 的修饰态。**只有 accepted 进入库。** 拒绝/延后不做不可逆删除（原则 5/8）。

默认路径快：全部 proposed 默认视同接受（Accept all 是一键确认），单张只需处理有问题的。

## 5. Illuminate — 完成体验【前】

入库成功后整页转入完成态（不是 toast、不是跳走）：

- 静默标题：「Your information now has a place in GSC.」
- 本次入库清单：语义名 · 类型 · 来源 ·（若打了标签）标签摘要——**只显示真正落库的数据**。
- 若有 deferred/未决提案：单列一行「N 项未决」。
- 动作：查看这些信息（→ Raw 详情）· 回到 Context Space（→ Overview）· 再来一次 Light Up（→ 清空重来）。

## 6. 微交互清单

拖放进场反馈 · URL 预览横幅（明示未持久化）· 选中 Sheet↔原文高亮联动 · inline 编辑即时生效 · 采纳后 Sheet 状态过渡（轻移+色标切换）· 批量选择不遮蔽单张控件 · 元数据展开为行内 inspector 非跳转 · Tab/方向键在 Sheet 间移动、Enter 进编辑、Esc 退出【前】· 拒绝/恢复可逆【前】。`prefers-reduced-motion`：全部过渡→直切。

## 7. 状态迁移错误与恢复

- 入库中途失败：已成功的条目保持入库（逐条 createItem 是独立事务），失败条目留在 Sheet 标错误态「入库失败 · 重试」，原文不丢。
- URL 抓取失败：错误行+保留 URL 输入。
- Agent 不可用：仅禁用「Ask Agent for names」，其余流程不受影响。
