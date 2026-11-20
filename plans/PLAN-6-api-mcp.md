# PLAN-6 — 外部基础设施：GSC API / MCP / Provider

Status: `PROPOSED` · 源：`PRODUCT_VISION.md` §6 · 依赖：PLAN-1（稳定契约）、最小权限集（见 PLAN-7 前置）

## 目标场景

用户在 Claude Code 里说「按我的 GSC 里那条『Chunking 优于长上下文』继续写」，Claude Code 通过 GSC MCP 精确取回该 Chunk（含原文、来源、关联），而不是重新猜一遍用户偏好。Codex、Pi Agent 同理。第三方应用用 SDK 也能做同样的事。

## 现状 → 缺口

| 层 | 现状 | 缺口 |
|---|---|---|
| 域契约 | `src/lib/*.ts` 共享类型 ✓ | 对外稳定版本号、兼容策略 |
| GSC API | `node:http` 本地端点（无鉴权） | 对外暴露面 + token/授权 |
| MCP | 无（现状靠 GSC-CONTEXT.md 文件） | MCP server：按身份取 Chunk、浏览 Cluster/Context、读 User Profile、提案写入 |
| Provider/SDK | 无 | 轻量 JS/Python client |
| 权限 | DESIGN_BOUNDARIES 排除权限系统 | **需先获批修改边界**，做最小授权（只读 token + 范围） |

MCP 能力对应关系：discover→检索面、get_chunk_by_id→getItem、browse→list、user_profile→PLAN-8、propose→PLAN-1 proposals、update→显式授权写。

## 阶段

- **A6-1 契约冻结**：v1 API 契约文档（含删除/提案端点）、错误形状统一；现有端点加版本前缀 `/api/v1/`。
- **A6-2 最小鉴权**：本地 token（PAT 式）+ 只读/读写两档；边界文件改写获批。
- **B6-1 MCP server**：标准 MCP 工具集（get/list/search/propose）；Claude Code + Codex 实测。
- **B6-2 Provider**：TS/Python SDK 薄封装；文档与示例。
- **C6-1 多租户准备**：token 范围细化到 Cluster/Context 级（联动 PLAN-7）。

## 边界

不做云端托管多租户（远期）；不绑定任何 Agent Runtime；MCP 不暴露裸 SQL/内部表。

## 验证

Claude Code 实测取回指定 Chunk（字段完整、来源可溯）；未授权 token 读不到私有信息；契约测试锁定 v1 行为。

## 待决策

1. MCP 先做 stdio 本地还是 HTTP 远程？（建议 stdio 起步）
2. GSC-CONTEXT.md 文件导出保留为降级通道还是被 MCP 取代？（建议保留）
