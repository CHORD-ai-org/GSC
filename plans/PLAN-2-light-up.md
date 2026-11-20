# PLAN-2 — Light Up：用户主动采集管线

Status: `PROPOSED` · 源：`PRODUCT_VISION.md` §3.1 · 依赖：PLAN-1（A 阶段完成后即可动雏形）

## 目标场景

用户拖进一份 30 页 PDF：GSC 保留原文与来源 → 切出 8 个有意义的 Chunk → 每个给语义名 → 打上类型与 Meta Tag 债选 → 指出与既有 3 个 Chunk 的关联 → 用户改掉两个名字、拒掉一个关联 → 一键确认入库。另一条路：一段两行的随手笔记，回车即入库，不跑管线。

## 现状 → 缺口

| 管线步骤 | 现状 | 缺口 |
|---|---|---|
| 1 Input | Composer 文本 / Ctrl+O 文件 / New 表单 ✓ | URL、对话摘录、代码仓引用未支持 |
| 2 Ingestion | raw.filecontent 存 `data/files` ✓ | 非文本格式（PDF 等）解析 |
| 3 Segmentation | 无 | 切块策略（Agent 辅助，PLAN-4） |
| 4 Semantic Identification | 手填 title | 机器提议语义名 + 人审 |
| 5 Classification | 手选 type/domain | 自动类型 + Meta Tag 债选 |
| 6 Association | 手动 Link | 关联债选（Detector 候选） |
| 7 User Review | 无 | **审阅台**：逐条 accept/edit/reject |
| 8 Persistence | createItem ✓ | 落 proposals→confirm 链路（PLAN-1 B1-1） |

## 阶段

- **A2-1 输入面补齐**：URL 抓取（正文提取）、剪贴板捕获（`raw.message`）、粘贴富文本归一。手动模式全覆盖（Vision 3.1-A）。
- **B2-1 审阅台 UI**：Light Up 工作区页面（输入 → 预览切块/命名/标签 → 逐条审 → 入库），复用 Object Detail 分区语言。
- **B2-2 双模式统一**：Manual 与 Agent-Assisted 产出走同一模型；短文本短路（跳过 3–6 直接入库）。
- **C2-1 批量与队列**：多文件/整目录 Light Up，进度与失败重试；大文档分段审阅。

## 边界

不做 OCR、不做自动入库（步骤 7 不可省）、不做浏览器插件/剪藏器（后续单列）。

## 验证

手动模式端到端截图；Agent 模式下每个提议可见出处且可拒绝；短文本 3 秒内入库；原文在任何步骤后可完整回看。

## 待决策

1. 审阅台是独立页面还是 Start 页内的流式面板？
2. 切块粒度由用户指定还是全自动？
