# GSC — Agent 接入教程（/foragents）

读者：用户设备上的 AI Agent。本页唯一目的：让你完成 GSC 连接配置，并知道行为的边界。

两条铁律，先记住：

1. 你对用户数据的任何变更，只能通过**提案**（gsc_propose / POST /api/proposals），由用户裁决后才落库。
2. 你不能绕过提案直接写。没有例外。

## 1. GSC 是什么

GSC 是用户本地的信息基础设施：把碎片信息变成持久、可寻址、可复用的 context。核心概念：
- **Chunk**：最小信息单元（一条笔记/摘录/记录）。
- **Cluster**：主题关联的区块（"项目"只是 Cluster 的一类举例）。
- **Context**：显式成员的上下文单元（研究主题/决策域）。
- **Meta Tag**：三层打标（组/标签/参数）。
- **提案制**：一切机器变更都是 pending 提案，人 accept 才生效。

## 2. 连接配置

- **API base**：``http://127.0.0.1:8788``（GSC API 默认端口；用户自定义端口以其实际为准）
- **鉴权**：``Authorization: Bearer <PAT>``
- **PAT 来源**：用户在 GSC「设置 → 连接」创建；或 ``POST /api/tokens``
- **MCP 环境变量**：``GSC_API_URL``（API 地址）+ ``GSC_API_TOKEN``（PAT）

## 3. MCP 接入（推荐路径）

用户侧启动：``npm run mcp``（stdio，JSON-RPC 2.0）。

**连通判定**：tools/list 返回 9 个工具，即接入成功：

``````
gsc_get_chunk  gsc_list_chunks  gsc_search
gsc_browse_clusters  gsc_get_cluster
gsc_browse_contexts  gsc_get_context
gsc_get_user_profile
gsc_propose
``````

**通用 MCP client 配置片段**：

``````json
{
  "mcpServers": {
    "gsc": {
      "command": "node",
      "args": ["<GSC 仓库路径>/server/mcp/index.ts"],
      "env": {
        "GSC_API_URL": "http://127.0.0.1:8788",
        "GSC_API_TOKEN": "<用户的 PAT>"
      }
    }
  }
}
``````

（codex / opencode / WorkBuddy 专用片段：F2 校对各最新文档后补充——以各家当前格式为准，勿凭记忆复制。）

## 4. REST 快径（无 MCP 时）

请求头：``Authorization: Bearer <PAT>``；响应统一信封 ``{"ok":true,...}``。

| 能力 | 端点 |
|---|---|
| 列条目 | ``GET /api/items?limit=20`` |
| 单条 | ``GET /api/items/:id`` |
| 搜索 | ``GET /api/search?q=<词>`` |
| 区块 | ``GET /api/clusters`` / ``GET /api/clusters/:id`` |
| 上下文 | ``GET /api/contexts`` / ``GET /api/contexts/:id`` |
| 提案 | ``GET /api/proposals?status=pending`` · ``POST /api/proposals`` |
| 识别 | ``POST /api/agent/detect``（五维轮：dedupe/association/metadata/meta_tag/tag discovery） |

错误语义：``400`` 契约错误 · ``404`` 目标不存在 · ``409`` 版本冲突（读最新重试）· ``422`` 状态机非法迁移。
写操作建议带 ``Idempotency-Key`` 头（重放安全）。

## 5. 写前确认（红线）

- 你的建议 → ``gsc_propose`` → pending 提案 → 用户在提案面裁决 → accept 才落库。
- ``POST /api/agent/detect`` 是建议**源**（产出提案），不是写入方。
- 用户拒绝的提案留痕；不要对同一变更反复重提。

## 6. 画像（即将可用）

``GET /api/contexts/:id/profile`` —— 对任一 context 单元四问可答：
info（是什么）/ trajectory（何以）/ vision（何往）/ position（立场）。
G6 B 批落地后本节启用。

## 7. 健康检查与常见故障

- ``GET /api/items?limit=1`` 返回 ``{"ok":true,...}`` = API 在线。
- ``GET /api/llm/config`` = 用户的 LLM 缝合配置（其 key 失效时相关建议维会静默降级——可提醒用户换 key）。
- 连不上 / 502 = API 未启动：提醒用户 ``npm run api``。
