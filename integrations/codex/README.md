# Codex 集成（G2 采集闭环）——notify 钩子 + rollout 收割

机制（已核实 2026-11-23）：
- `~/.codex/config.toml` 的 `notify` 钩子在每轮完成（`agent-turn-complete`）时被调用，
  事件 JSON 走 argv（TUI 会话另有 `CODEX_THREAD_ID`/`CODEX_SESSION_ID` 环境变量，可能为空串）。
- 会话记录在 `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`（**格式非稳定 API**，收割器
  尽力解析，漂移记 KNOWN_ISSUES）。

## 安装（一次性）

1. 在 `~/.codex/config.toml` 加：

```toml
notify = ["node", "D:\\github projects\\GSC\\integrations\\gsc-push.mjs", "--codex-event"]
```

2. 验证：跑一轮 codex，然后查 GSC：

```bash
curl -s "http://127.0.0.1:8788/api/items?limit=3"   # 应出现本轮摘录
```

## 行为

- 每轮完成 → gsc-push 读最新 rollout → 摘 `message` 轮次文本 → 按组
  `codex×<项目目录名>×<thread-id>` 推 `/api/ingest/batch`。
- 幂等：同一 rollout 重推由 GSC 侧快照 hash 去重（skipped）。
- 兜底手动：`node gsc-push.mjs --client codex --project X --session Y --file excerpt.txt`。

## 边界（矩阵如实）

- ✅ 数据分组上传（本页能力）
- ❌ 模型调用时取 GSC 上下文（codex 结构性限制）
- 🔜 MCP 读（G3 下批：把 GSC 做成 MCP server 供 codex 查询画像）
