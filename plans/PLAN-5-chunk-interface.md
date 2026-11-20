# PLAN-5 — Chunk 界面重设计（结构先于字段）

Status: `PROPOSED` · 源：`PRODUCT_VISION.md` §8 · 依赖：PLAN-1（Chunk 定义稳定）

## 目标场景

用户打开 Chunks 总览：不用逐条点开，一眼扫过就能看出——绿色区块=用户确认的语义名，灰色=原文，紫色=机器解释（未确认），底部色带显示每条的 Cluster/Context 归属，右侧时间轴显示本周新增 12 条、3 条待审。颜色在整个产品里含义固定。

## 设计要点（Vision §8）

| 要求 | 落法 |
|---|---|
| 分区呈现 | Chunk 详情四区：原文 | 语义身份 | 元数据 | 来源（对齐现有 Object Detail 分区语言，Raw/Object 融合视图） |
| 稳定色彩语义 | 全局色彩字典：原文灰 / 用户确认绿 / 机器提议紫 / 异常红；写进 tokens，禁随意分配 |
| 来源指示 | 原文 vs 生成解释的角标（origin + proposal 态） |
| 关系指示 | 归属色带：Cluster/Context 成员关系一眼可见 |
| 时间可视化 | GitHub contributions 式密度图：创建/修改/确认三事件分色 |
| 目标 | 「不点开字段就看懂结构」 |

## 现状 → 缺口

现有 Layout v2 的 Object Detail 已是分区块结构 ✓；缺色彩语义、归属色带、时间密度图、原文/解释视觉区分。

## 阶段

- **A5-1 色彩字典**：语义色进 `tokens.css`（双主题），Legend 组件；给 raw/object 详情加「原文/解释」角标。
- **B5-1 归属色带 + 时间密度图**：列表行带 cluster/context 色点；Recently/Overview 加密度图区块。
- **B5-2 Chunk 融合详情**：若 PLAN-1 裁决合并，则详情页统一为 Chunk 四区视图；否则做 raw↔object 联动视图。
- **C5-1 大集合可读性**：虚拟滚动、密度图下钻（点一天筛一天）。

## 边界

不做装饰性动效；不推翻 Layout v2 的 Collection/Object Detail 双模式（只增强）；色彩不承担唯一语义（配文字，可访问性）。

## 验证

双主题截图核对色彩字典一致；色盲模拟下信息不丢失（文字兜底）；密度图点击可筛选。

## 待决策

1. 色彩字典的具体色板（等 PLAN-1 定了 Chunk 分类再定）。
2. 密度图放 Overview 还是 Recently（建议 Overview）。
