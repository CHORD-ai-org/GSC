---
name: gsc-push
description: 把对话摘录/文件/批量材料上传到本机 GSC（Global Shared Context）信息库，走分组入料 API（client=workbuddy）。当用户说「存进 GSC」「上传到 GSC」「把这段对话/这个文件给 GSC」「GSC 归档」「push to GSC」或要求把工作产出沉淀进 GSC 时使用。也用于查询上传结果与分组是否正确。
---

# gsc-push — WorkBuddy → GSC 采集通道

G2 采集闭环里最容易测试的一端。本 skill 只做**搬运**：把文本按组推给 GSC 的
`/api/ingest/batch`；命名/分类/归块全由 GSC 端提案制完成（采纳/拒绝才落位）。

## 前置

- GSC API 在 `http://127.0.0.1:8788`（不在则提示用户双击桌面 `bats\start-gsc-dashboard.bat`，
  或自行 `GSC_INGEST_ALLOW_PRIVATE=1 PGLITE_DIR=./.data/pglite-v2 npm run api` 于
  `D:\github projects\GSC`）。
- 可选 `GSC_TOKEN`（API 开鉴权时用 Bearer）。

## 分组约定（组 = client × project × session）

- `client` 固定 `workbuddy`。
- `project` 取当前工作区项目名（如 `GSC`；用户指定了就用用户的）。
- `session_id` 取对话标识或日期（如 `2026-11-23-chat`；用户没给就自动生成）。

## 能力

| # | 能力 | 触发说法 | 动作 |
|---|---|---|---|
| 1 | 存对话摘录 | 「把这段存进 GSC」 | 取用户指定或本轮关键结论文本 → 单 doc 推送 |
| 2 | 存文件 | 「把这个文件上传到 GSC」 | 读文件全文 → 单 doc 推送（title=文件名） |
| 3 | 批量归档 | 「把这批都归进 GSC」 | 多文件/多段 → 一次 batch（≤50 docs/批） |
| 4 | 查结果 | 「GSC 收到了吗」 | 查 `/api/items?limit=5` + `/api/proposals`，报导入数/分组/提案 |
| 5 | 核对分组 | 「分组对不对」 | 查 sources：应出现 `agent:workbuddy:<project>` |

## 命令（bash，直接可跑）

单段文本：

```bash
curl -s -X POST http://127.0.0.1:8788/api/ingest/batch \
  -H "content-type: application/json" \
  -d '{"group":{"client":"workbuddy","project":"GSC","session_id":"2026-11-23-chat"},"docs":[{"title":"<语义短题>","content_text":"<正文>","captured_at":"2026-11-23T20:00:00+08:00"}]}'
```

文件（用 CLI 更稳，含 JSONL 收割）：

```bash
node "D:\github projects\GSC\integrations\gsc-push.mjs" \
  --client workbuddy --project GSC --session 2026-11-23-chat \
  --file /path/to/notes.md --title "会议笔记"
```

返回口径：`{"ok":true,"source_id":"...","imported":N,"skipped":M,"block_proposals":K}`。
`imported=0 skipped=N` = 幂等命中（这批已在库里）。

## 核对（上传后必做）

```bash
curl -s "http://127.0.0.1:8788/api/items?limit=3"        # 新条目在
curl -s "http://127.0.0.1:8788/api/sources"              # agent:workbuddy:<project> 分组锚点在
curl -s "http://127.0.0.1:8788/api/proposals?status=pending"  # 命名/归块提案在
```

把 `imported/skipped/block_proposals` 和提案条数如实报给用户；失败把 HTTP 状态+返回体报出来，
不要假装成功。

## 边界

- 只搬运用途文本；密钥/token/凭据一律不传。
- 不替用户采纳提案（裁决权在用户/详情页三键）。
- 上限 50 docs/批、正文去首尾空白；空正文拒绝。
- API 不可达时：提示启动方式，不静默重试超过 2 次。

## 自测清单（e2e，本通道验收）

1. 推一段摘录 → `imported=1`；2) 重推同段 → `imported=0 skipped=1`（幂等）；
3. sources 出现 `agent:workbuddy:<project>`；4) pending 出现命名/归块提案；
5) 采纳一条归块提案 → 条目进对应 cluster（可用 `/api/clusters` 核）。
