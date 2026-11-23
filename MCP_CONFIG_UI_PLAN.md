# MCP_CONFIG_UI_PLAN.md — Settings › MCP 配置页（前后端同步）

Status: `PROPOSED` — 2026-11-23，待确认后执行。
背景：MCP server 已存在（`server/mcp/index.ts`，stdio JSON-RPC，9 个 `gsc_*` 工具，D-059/INTEGRATION_HARDENING），
但配置全靠环境变量（`GSC_API_URL` + `GSC_API_TOKEN`），UI 零入口——G2 三端采集闭环
（opencode/codex/workbuddy 经 `gsc_propose` 分块入提案）每个接入端都要手填命令行。
本计划补 Settings › MCP 板块 + 后端共享工具注册表，把「接入一个 agent」变成复制粘贴。

## 0. 现场（已核对到行）

| 事实 | 证据 |
|---|---|
| MCP server 只读面 + 提案写入口：9 个工具 | `server/mcp/index.ts:45-112`（get_chunk/list_chunks/search/browse_clusters/get_cluster/browse_contexts/get_context/get_user_profile/**propose**） |
| 工具注册表是 server/mcp/index.ts 内部字面量 | 同文件 TOOLS 数组——UI 想列工具只能硬编码（漂移面） |
| PAT 管理 UI 已有（一次性明文回显先例） | `src/views/pages.tsx:494-522` TokenSection（T301）：创建后 `fresh` 明文显示一次 |
| Settings 页骨架：settingCaption/settingInput/settingValue 样式类已有 | 同文件 + app.module.css |
| MCP 接入即 env 注入：`GSC_API_TOKEN=... npm run mcp` | `package.json` scripts.mcp、`server/mcp/index.ts` 头注释 |

## 1. 任务卡（AGENTS.md §3）

- **Purpose**：agent 接入 GSC 的配置从「读文档手敲命令」变成「Settings 里选 token → 复制片段」。
- **Scope**：Settings › MCP 板块；工具注册表抽共享模块 + `GET /api/meta/mcp`；4 个客户端配置片段生成。
- **Interacts with**：`server/mcp/index.ts`、新 `server/mcp/tools.ts`、`server/router.ts`（新 1 路由）、
  `src/views/pages.tsx`（Settings 新 section）、`src/lib/strings.ts`、`docs/API_CONTRACT.md`。
- **Does not own**：MCP client 方向（GSC 接外部 MCP server）、HTTP transport/常驻 server、
  新 token 体系（沿用 T301 PAT）、gsc_* 工具增删（属 G2 功能面）。
- **User flow**：Settings → MCP 板块 → ① 看到接入命令卡 + 选择 PAT（scope read/rw）→
  ② 选客户端（Claude Code / Codex / opencode / WorkBuddy）→ ③ 复制生成的配置片段 →
  ④ 粘进客户端配置重启即连 → ⑤ 工具清单卡确认 `gsc_*` 可见。
- **Minimum implementation**：共享注册表 + 1 个 GET 端点 + 1 个纯函数片段生成器 + Settings section（复制按钮）。
- **Test method**：`npx vitest run`（注册表导出契约测试 + 片段生成纯函数测试）；`node scripts/api-checks.mjs` 过；
  手工：Settings 复制片段 → 粘贴客户端 → `gsc_search` 调用返回。

## 2. 后端（同步做）

| # | 任务 | 改什么 | 验收 |
|---|---|---|---|
| M-1 | 工具注册表抽共享模块 | `server/mcp/tools.ts`：TOOLS 数组（name/description/annotations/参数 schema）移入；`mcp/index.ts` 消费 | mcp.test.ts 全绿；tools/list 与导出注册表一致（断言锁死） |
| M-2 | `GET /api/meta/mcp` | 返回 `{ tools: [...], command: 'npm run mcp', env: ['GSC_API_URL','GSC_API_TOKEN'], server: { name, version } }`——前端不硬编码工具面 | 契约测试：tools 与 M-1 注册表逐项一致（防漂移） |
| M-3 | 契约登记 | API_CONTRACT 增补该端点；openapi META 同步 | openapi↔registry 对齐断言过 |

鉴权：`GET /api/meta/mcp` 走现有 token 门（read scope 即可）；不泄 token 明文（secret 只在 T301 创建时一次性回显）。

## 3. 前端（Settings › MCP 板块）

| # | 任务 | 改什么 | 验收 |
|---|---|---|---|
| U-1 | 接入命令卡 | 显示 `GSC_API_URL=... GSC_API_TOKEN=<token> npm run mcp`；token 选择器复用 TokenSection 的 PAT 列表（新建「MCP 专用」快捷键 = createToken scope 选择） | 明文 token 仅在「刚创建」时嵌入（T301 先例），已有 token 只显占位符 |
| U-2 | 客户端片段生成器（纯函数） | `src/lib/mcpSnippets.ts`：`(client, {url, token, scope}) → string`，4 targets：Claude Code（.mcp.json）、Codex（config.toml）、opencode（json）、WorkBuddy（mcp.json） | 纯函数单测 4 目标 × 占位/真 token 两态；片段含 gsc_propose 时要求 rw scope 提示 |
| U-3 | 工具清单卡 | 从 `GET /api/meta/mcp` 拉取渲染：名字 + readOnly/destructive 标注 + 简述 | 不硬编码；断网显 fallback |
| U-4 | i18n | strings.ts 补 mcp.* 键（zh/en），字段标签走既有 seam | zh/en 覆盖测试过（U3 先例） |

## 4. 批次与出口

| 批次 | 内容 | 出口 |
|---|---|---|
| A 后端 | M-1 → M-2 → M-3 | 契约测试过；mcp.test 全绿 |
| B 前端 | U-2 → U-1 → U-3 → U-4 | vitest 全绿；tsc=0 lint=0；Settings 截图验收 |

依赖：U-2 依赖 M-2 的工具面（仅文案展示，弱依赖可先行）。

## 5. 待决策（2 个，`PROPOSED`，附建议）

1. **片段目标客户端**：建议 G2 三端（opencode/codex/workbuddy）+ Claude Code 共 4 个；其他后补。
2. **token 明文进片段的时机**：建议沿 T301 一次性回显先例——仅「本次新建的 token」自动嵌入明文，
   已有 token 用 `<GSC_API_TOKEN>` 占位符（secret 不可再取，是哈希存储的正确行为）。

## 6. 不做

MCP client 反向接入、HTTP/SSE transport、MCP server 常驻化、token 体系改动、工具面增删（G2 功能）。
