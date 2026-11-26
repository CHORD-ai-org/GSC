# FORAGENTS_PLAN.md — `/foragents` Agent 专用教程页（规划）

Status: `DECIDED` — 2026-11-26 执行 F1（F2 配置片段校对/F3 画像节待办）；侧栏入口=完全隐藏（确认点①从严）。创始人需求：单独页面（路由 `/foragents`，**不在用户界面
导航展示**），专门给 Agent 的 GSC 教程，让用户的 Agent 在用户设备上配置 GSC 连接。

## 0. 现状盘点（比预想好——大部分已建成）

| 资产 | 现状 |
|---|---|
| MCP server | ✅ `server/mcp/`（D-059，stdio JSON-RPC v0.3.0，`npm run mcp`） |
| MCP 工具 | ✅ 9 个：gsc_get_chunk / list_chunks / search / browse_clusters / get_cluster / browse_contexts / get_context / get_user_profile / **gsc_propose** |
| MCP 配置约定 | ✅ env `GSC_API_URL`（默认 8788）+ `GSC_TOKEN` |
| PAT | ✅ `/api/tokens` CRUD（tokens 面板在 settings） |
| REST 面 | ✅ 60 路由 + `/api/openapi.json` + `/api/docs`（HTML） |
| **缺** | ❌ 把以上串成「Agent 自举教程」的单一入口页；❌ MCP 的各 agent 配置片段模板 |

## 1. 定位与读者

- **双读者**：① 用户的 Agent 本体——直接 fetch 页面读懂并自配置（一等公民，**纯 Markdown
  形态**）；② 配置中的人——浏览器打开复制粘贴片段。
- **不进导航**：Sidebar/GROUPS 不加条目；直接访问 URL 可达；侧栏 footer 可留一个不显眼的
  「for agents」链接（待定）。
- **铁律写进页面**：Agent 对用户数据**只可提案、不可直写**（gsc_propose→人裁决）——这是
  GSC 与一切 agent 集成的边界，教程第一屏就讲。

## 2. 内容骨架（七节，单一 Markdown 源）

1. **What is GSC**（≤5 句）：信息基础设施；Chunk/Cluster/Context/Meta Tag 四概念；提案制红线。
2. **连接配置**：API base（默认 `http://127.0.0.1:8788`）· 创建 PAT（settings→tokens 或
   `POST /api/tokens`）· env `GSC_API_URL`/`GSC_TOKEN`。
3. **MCP 接入（推荐）**：`npm run mcp` 启动；**各 agent 配置片段模板**——codex CLI、opencode、
   WorkBuddy 连接器、通用 MCP client JSON（claude 风格）；tools/list 应见 9 工具=连通。
4. **REST 快径（无 MCP 时）**：`Authorization: Bearer <PAT>`；核心端点表（items/search/
   contexts/clusters/proposals/detect）+ 响应信封（{ok:true}）+ 错误语义（400 契约/404/409
   版本冲突/422 非法迁移）+ 幂等（Idempotency-Key）。
5. **写前确认（红线）**：一切变更走 `gsc_propose`/`POST /api/proposals` → 人裁决；
   detect 五维轮是建议源，不是写入方。
6. **画像（G6 预告节）**：`GET /api/contexts/:id/profile` 四问可答（B 批落地后启用本节）。
7. **健康检查**：`GET /api/items?limit=1` + `GET /api/llm/config` 两条探活 + 常见故障
   （401=换 key、502=API 未启动）。

## 3. 实现设计（单一内容源、双形态）

```
server/agents-tutorial.ts   ← MD 字符串唯一源（导出 AGENTS_TUTORIAL_MD）
router: GET /api/foragents.md   ← text/markdown 返回（agent fetch 一等公民）
App.tsx: case 'foragents'       ← 隐藏视图：fetch 同一 MD + 极简渲染（标题/代码块/复制按钮）
Sidebar: 不注册
```

- 为什么 server 侧出 MD：agent 在用户设备上 `curl http://127.0.0.1:8788/api/foragents.md`
  即可自举——**不依赖前端构建产物**。
- 页面渲染从同一 MD 拉取 → 内容永不双写。

## 4. 分批

| 批 | 内容 | 出口 |
|---|---|---|
| F1 | MD 内容源 + `/api/foragents.md` + 隐藏 React 路由（pre 渲染+复制） | `curl /api/foragents.md` 返回全文；`#/foragents` 可达且导航无入口 |
| F2 | 四类 agent 配置片段模板 + tokens 创建指引校对 | 按 MD 片段配置任一 agent→tools/list 见 9 工具 |
| F3 | G6 画像节启用（待 B 批） | profile 节带真响应示例 |

## 5. 任务卡（七项）

1. **Purpose** 让用户的 Agent 在设备上自举配置 GSC——MCP/REST 面已建成但无自举入口。
2. **Scope** MD 内容源 + `/api/foragents.md` + 隐藏视图 + 四类配置片段模板。
3. **Interacts** router.ts（新路由）· App.tsx（hidden case）· server/mcp（文档对象）·
   repo/tokens（指引校对）· strings（页面文案）。
4. **Does not own** MCP server 行为改动 · 新端点 · 用户导航 UI · G6 profile 实现。
5. **User flow** 用户在 settings 建 PAT → 打开 `/foragents` 复制 codex/opencode 片段 →
   粘到 agent 配置 → agent `tools/list` 连通 → agent 用 gsc_propose 提建议 → 用户在提案面裁决。
6. **Minimum（F1）** MD 源 + 两个形态路由 + 隐藏视图。
7. **Test method** vitest（`/api/foragents.md` 200+含七节标题；MCP tools 数=9 断言）+
   curl 真链 + `#/foragents` 截图（导航无入口）。

## 6. 不做

MCP server 行为改动 · 自动 token 签发（人建 PAT）· 外网暴露方案 · agent 自动写权限（红线）。

## 7. 残余确认点

1. 侧栏 footer 是否留不显眼入口（还是完全隐藏、仅知道 URL 可达）？
2. codex/opencode/WorkBuddy 三片段模板的**当前准确配置格式**需按各家最新文档校对——
   F2 我逐家核对后再落（避免给过期格式）。
