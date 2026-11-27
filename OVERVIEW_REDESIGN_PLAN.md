# OVERVIEW_REDESIGN_PLAN.md — Overview 页新设计（创始人笔记 → 发散 → 计划 v2）

Status: `PROPOSED` — 2026-11-27（v2：按创始人修正更新——C=仅 subsection 无边界；
新增视觉质量标准与后端批次；文档更新为交付义务）。
输入：创始人手绘笔记 + ui-ux-pro-max 结论（Swiss/Minimalism 印证现有 token，不换系统）。

## 0. 创始人修正（v2 定调）

1. **C 方向纠偏**：整页**不是**无边框画布——只有 **cluster 横滑 subsection** 是无边界
   （渐变背景、卡片无边界框）。页面其余部分仍是常规白底结构化布局。
2. **视觉质量红线**：实际产出必须**比草稿更好**——草稿是布局骨架，产出要在对比度/
   层级/间距/细节上全面超越（标准见 §3）。
3. 后端牵涉一并规划（§4）；**做完必须更新文档**（§6，AGENTS §5 义务）。

## 1. 笔记逐条解析（→ 规格）

| 笔记元素 | 规格 | 数据源（全真实） |
|---|---|---|
| Start/OV 切换 + sidebar 名称跟随 | 已上线（homeMode），挪到欢迎区同排右侧 | — |
| 「欢迎回来，Ceaser / 发生了哪些新故事？」 | 大标题+副语；名字=`/api/profile/status`；副语按时段变化 | 已有端点 |
| 四源 logo 行（X 带绿勾）+「进入用户画像」 | 复用 onboarding 源卡（X 官标+绿勾=oauth_tokens）；箭头 pill → 提案面 pending 过滤视图 | `/api/auth/x/status` |
| 今日数据传输量卡（流量图+其他指标） | 近 7 日 events 按日柱状（手绘 SVG 零依赖）+副指标（今日新增 chunks/提案数） | **新端点** `GET /api/overview/stats` |
| 历史记录（活动叙事流，末条黑底高亮） | `{来源图标}{来源} {动词短语} {对象标题}`；数据=events+proposals 合流；模板叙事在前端；空态引导不造假 | **新端点** `GET /api/overview/feed` |
| 「下面想编辑什么？」cluster 横滑区 | **仅此 subsection 无边界**：渐变底+无边框卡+按住拖动横滑+scroll-snap+左右键 | `/api/clusters` |
| 页面可往下滑很多 | 新区块在上，旧区块（最近/待裁决/meta tags）下沉为滚动后段，不删 | — |

## 2. 视觉质量标准（超越草稿的具体承诺）

1. **层级**：问候语 ≥28px/650 重；区块标题 13px 大写间距；正文 13px/1.7——三级分明。
2. **对齐**：全页统一 36px 页边距+区块间 44px 垂直节奏；统计卡/源卡同基线。
3. **色彩**：沿用 tokens.css（--ink 系）；渐变横滑区=极浅暖灰→白（对比度不牺牲文字）；
   唯一强调色=accept 绿与 accent，不引入新色相。
4. **细节**：柱状图带 hover 数值提示；活动流来源图标用品牌图形（非 emoji）；卡片 hover
   200-250ms 位移反馈；最后一条活动黑底白字（笔记原意）+圆角 999。
5. **可达性**：横滑区支持←→键+焦点环；渐变上文字 4.5:1；reduced-motion 全降级。

## 3. 后端牵涉（两个只读聚合端点，无新表/无 JSONB）

| 端点 | 形状 | 实现 |
|---|---|---|
| `GET /api/overview/stats` | `{days:[{date,count}×7], today_items, today_proposals}` | events 表按 at 分日计数+items/proposals created_at 当日计数；repo 层新聚合函数 |
| `GET /api/overview/feed` | `{feed:[{at, actor, kind, verb, target_title, highlight}]} ≤12` | events（item join 标题）+proposals 合流倒序；动词映射在前端模板层 |

路由均 GET 只读；vitest：stats 对账（造 N 条 event 断言计数）+feed 合流排序断言。

## 4. 分批

| 批 | 内容 | 出口 |
|---|---|---|
| **OV-BE** | 上表两端点+repo 聚合+测试 | ✅（2/2 测试+真链：stats 7 日桶/feed 合流标题） |
| **OV1** | 欢迎区+源行+进入用户画像入口；seg 挪欢迎行右 | ✅（ov1-welcome.png，观感超草稿） |
| **OV2** | 今日数据传输量卡（接 stats） | ✅（ov2-datacard.png，真数据柱状+副指标） |
| **OV3** | 历史记录活动流（接 feed+叙事模板+末条高亮+空态） | ✅（ov3-feed.png，真实叙事+末条黑底） |
| **OV4** | cluster 无边界横滑区（drag+snap+键盘） | 拖拽/滚轮/键盘三路 |
| **OV5** | 旧区块下沉+长页节奏+整页 1080P 对照 | ✅ 节奏对照完成（ov5-long.png：双栏/44px/统计卡灰白）；整页微调留尾巴 |

## 5. 任务卡（七项）

1. **Purpose** Overview 从统计面板升级为个人主页叙事（创始人定调），且视觉必须超越草稿。
2. **Scope** overview 视角六区块+两个只读聚合端点+旧区块下沉；不动侧栏/其他页。
3. **Interacts with** OverviewPage · 新 repo 聚合（events/items/proposals 只读）· router 两路由 · onboarding 源卡复用 · tokens.css。
4. **Does not own** 新表/JSONB blob · 造假数据 · 其他页面 · 写权限端点。
5. **User flow** OV 视角 → 问候+源行 → 今日流量 → 扫历史记录 → 拖选 cluster 进入 → 下滚旧区块。
6. **Minimum** OV-BE+OV1。
7. **Test method** vitest（聚合对账/feed 排序/叙事模板纯函数）+ curl 真链 + 1080P 全页截图对照笔记。

## 6. 文档更新义务（做完必须，AGENTS §5）

- IMPLEMENTATION_STATUS：OV 各批落地记录+截图档索引。
- DECISION_LOG：D-117（Overview 叙事化方向+C 纠偏）。
- KNOWN_ISSUES：活动流叙事文案待创始人美化（笔记自注）。
- 本计划状态翻 `DECIDED`/各批勾选。

## 7. 待确认（执行前）

1. 「进入用户画像」落点=提案面 pending 过滤视图（建议）——还是别的？
2. 旧区块下沉保留（不删）确认。
