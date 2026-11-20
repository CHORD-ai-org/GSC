# PRODUCT_GAP_REGISTER.md — 产品缺口登记（Phase 03）

> 2026-11-20 · 每缺口含证据与建议解法。分级口径：P0=旅程断裂/违背根基承诺；P1=能完成但体验不可靠；P2=增强；P3=当前阶段不必需的 Vision 能力。

## P0 — Blocking（3）

### GAP-01 产品身份与账户层缺失
- **阶段**：Stage 1（账户创建）
- **用户目标**：发现 GSC → 明白它是什么 → 创建账户开始使用
- **期望**：落地页/产品内价值陈述 + 注册登录 + 初始账户状态
- **现状**：应用直启，无 landing、无 auth，身份硬编码 `usr_local`（`server/storage/tokens.ts:33`）
- **证据**：全仓 grep 无 signup/login/onboarding 代码
- **缺失**：账户系统、价值传达、会话管理
- **为何重要**：旅程无法开始；Stage 8 分享被同一缺口二次阻塞（无第二用户）
- **依赖**：postgres 适配器（规模化时）；分享模型已在
- **建议**：先做「本地账户 + 价值陈述页」过渡（注册可后置），产品内加 onboarding；多用户与云端账户单独立项

### GAP-02 首次体验空白（Onboarding）
- **阶段**：Stage 2（引导初始化）
- **用户目标**：10 分钟内明白信息模型并完成第一次捕获
- **期望**：欢迎流 → 信息模型一句话教学（四概念）→ 可跳过的 Profile 问答 → 示例内容 → 首个动作
- **现状**：什么都没有，只有 composer placeholder 一句
- **证据**：`src/app/App.tsx` 无引导组件；Docs 页是功能清单非教学
- **缺失**：引导向导、示例 Workspace、概念对比解释
- **为何重要**：四概念（Chunk/Cluster/Context/Meta Tag）不自明，普通用户直接流失
- **依赖**：无
- **建议**：3 屏引导 + 可跳过 Profile 问答 + 一键「装入示例内容」+ 详情页内嵌概念提示

### GAP-03 信息找回断链（无搜索/无发现）
- **阶段**：Stage 5/6（日常与长期）
- **用户目标**：找回几周前存的信息、发现新旧信息的关联
- **期望**：全局搜索（标题/正文/标签）+ 结果内预览跳转；（进阶）相关条目推荐
- **现状**：仅列表页本地子串过滤（`collections.tsx matches()`），无跨页搜索、无全文、无相关推荐
- **证据**：全仓无 search API；`items.item_content` 无索引/FTS
- **缺失**：搜索端点（PG FTS/trigram 或 LIKE 起步）、全局搜索 UI（Ctrl+K 内嵌或独立面板）
- **为何重要**：违背 Vision §2.2「价值随积累增长」——存得越多越找不到，体验反向退化
- **依赖**：分页（GAP-06）协同
- **建议**：第一步 `/api/search`（标题+正文 LIKE/FTS）+ Ctrl+K 搜索结果区；相关推荐后置

## P1 — Important（5）

### GAP-04 Token/Agent 访问管理面缺失
- **阶段**：Stage 7/9
- **目标**：看得懂、管得住外部 Agent 的访问
- **现状**：铸/吊销仅 `scripts/create-token.mjs` CLI；已连接应用页只显示 Sync 源不含 Agent token；无访问日志
- **证据**：`revokeApiToken` 存在但无 API/无 UI；Settings「连接」页是静态文案
- **建议**：Settings→连接 改造：Token 列表（名称/范围/最后使用）+ 创建吊销 + Agent 访问记录（events 已有数据可聚合）

### GAP-05 删除不可撤销
- **阶段**：Stage 5/9
- **目标**：误删可恢复
- **现状**：DELETE 即物理级联（relations/events 级联删），仅 window.confirm 一道
- **证据**：`DELETE /api/items/:id` 级联；无软删列
- **建议**：软删（deleted_at）+ 回收站页 + 30 天清理事业；或先做「删除前自动导出该条 JSON」轻方案

### GAP-06 无分页/增量加载
- **阶段**：Stage 6（数百 Chunk）
- **目标**：规模增长后列表仍可用
- **现状**：`listItems` 全量返回，前端全量持有
- **证据**：`server/repo/items.ts` 无 offset/cursor；API 无 limit 参数消费
- **为何重要**：数百条起加载与渲染双退化；搜索（GAP-03）也依赖它
- **建议**：cursor 分页（updated_at,id）+ 前端滚动加载；Overview 统计走 COUNT

### GAP-07 信息演化语义缺失（过时/替代）
- **阶段**：Stage 6
- **目标**：标记「已过时/被推翻/被 X 替代」而不删除历史
- **现状**：只能编辑或硬删；events 记录历史但无生命周期状态
- **证据**：`items.status` 词表无 deprecated；Vision §11「演化」无对应
- **建议**：status 增 `superseded`/`outdated` + `superseded_by` 关系 + 详情页标记条；Detector 可提议过时候选

### GAP-08 概念教学与协作入口
- **阶段**：Stage 4/8
- **目标**：理解四结构差异；把 Cluster 分享给真人
- **现状**：概念无对比解释；分享 UI 在但无第二用户可选（`/api/users` 需 API 手工建）
- **建议**：概念卡（什么时候用哪个）+ 空态内教学；分享页在无多用户时改为「协作者管理」引导（邀请=创建用户=受限于账户层）

## P2 — Enhancement（5）

- **GAP-09 骨架屏/loading 细节**：列表加载空白 → 骨架行（Stage 5，证据：无 skeleton 组件）
- **GAP-10 批量操作入口**：Light Up 批量审阅/列表批量打标入口太深（Stage 3/5）
- **GAP-11 每日同步调度**：frequency=daily 字段在，调度器未跑（Stage 7，C3-1 占位）
- **GAP-12 Agent 提议即时性**：命名/标签建议应在 Light Up 采集时即时出现，而非仅事后提案（Stage 3）
- **GAP-13 引用/复用弱**：详情页「引用此条到 Context/Cluster」快捷动作；导出带引用图（Stage 5/6）

## P3 — Future Capability（4）

- **GAP-14 语义/向量检索**：Vision 隐含的「关联发现」高级形态；当前显式关系已够用（DESIGN_BOUNDARIES 不引向量库）
- **GAP-15 按 Context 粒度授权**：Agent 只看指定 Context（Vision §6 方向）；现 token 两档够 MVP
- **GAP-16 API Provider / SDK 生态**：PLAN-6 C 段（Python SDK、用量计费）；当前 REST+MCP 够用
- **GAP-17 跨设备同步/云端账户**：本地优先正确；云端是部署议题非产品缺口

## 分级原则说明

- Vision 完整性 ≠ P0。GAP-14/15/16 是 Vision 能力但当前阶段不阻塞旅程 → P3。
- GAP-01 是 P0 因为旅程**开始不了**；GAP-08 的分享部分虽也断，但它复用 GAP-01 的解，不重复计 P0。
- GAP-03（搜索）升 P0：它违背「价值随积累增长」这一根基承诺，且积累越多伤害越大。
