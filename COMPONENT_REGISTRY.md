# GSC Component Registry

> 组件 = 明确职责 + 边界 + 输入/输出契约 + 依赖 + 持久化 + 运行时 + 测试 + 抽出策略。
> 产品能力 / 逻辑组件 / 代码模块 / 运行时进程 / 部署单元 相关但不等同。

## 组件清单
| 组件 | 职责 | 代码 | 持久化 | 状态 |
|---|---|---|---|---|
| Core Store | 信息单元 CRUD、provenance | `repo/*` | items/item_content/relations | 稳定 |
| Light Up | 采集→审阅→确认流 | `src/lib/lightup.ts` | proposals | 稳定 |
| Agent (整合) | 语义命名/分类/去重/关联/元数据 → 提案 | `agent/proposer, detector, llm` | proposals | 稳定 |
| Sources | 数据源连接与同步 | `repo/sources.ts`, `sync/github.ts` | sources | **扩展中** |
| **Web Intelligence** | 外部信息采集与处理 | `server/intel/**` | source_snapshots/capture_tasks | **新建** |
| Sync & Export | 数据源同步 + JSON/MD/Agent 导出 | `src/lib/sync.ts` | — | 稳定 |
| Secrets | 密钥 AES-256-GCM | `storage/secrets.ts` | — | 稳定 |
| Observability | metrics/healthz/readyz | `metrics.ts` | — | 稳定 |

## Web Intelligence（新建组件规格）
1. **Purpose**：把网页/外部来源信息转为 GSC 持久化、结构化、可复用信息（From Web Content to Persistent Information）。
2. **Responsibilities**：来源校验、抓取、结构化提取、归一化、快照、交 Light Up 生成提案、来源归属。
3. **Non-responsibilities**：不自主浏览/研究、不采集浏览历史、不直接写 confirmed 信息、不实现浏览器扩展/监控。
4. **Inputs**：URL / 来源配置（label/scope/token）、增量 since。
5. **Outputs**：`FetchedDoc`（adapter）→ `Extraction`/Snapshot → Light Up 提案。
6. **Internal modules**：`adapters/*`（web/rss/file/github/notion/drive/x）、`extract.ts`、`pipeline.ts`、`tasks` worker。
7. **External interfaces**：HTTP API（提交 URL/查状态/重试）、复用 proposals。
8. **Dependencies**：`ingest/ssrf`、`ingest/html`、`agent/*`、`repo/{items,proposals,sources,snapshots,tasks}`、`storage/secrets`。
9. **Data ownership**：snapshot/task 归 Web Intelligence；confirmed Chunk 归 Core（不因源删除而删）。
10. **Persistence**：`source_snapshots`、`capture_tasks`（新增）+ 复用 items/proposals。
11. **Runtime**：API 内模块 + 进程内 worker（职责分离）。
12. **Deployment**：今天内嵌 GSC Backend；未来可抽 `server/intel/**` 为独立服务。
13. **Security**：SSRF/资源限制/内容不信任/owner 隔离/来源归属（见架构 §7）。
14. **Scalability**：worker 可横向扩；契约稳定（`FetchedDoc`/`Extraction`）。
15. **Testing**：adapter 单测（fetch 注入）、SSRF 边界、去重、幂等、worker 恢复、Light Up 确认。
16. **Future extraction**：`server/intel/**` 整体抽出；数据仍归 GSC Core；认证走 token/OAuth；不复制权威库。

**与既有概念关系**：产出 Raw Information 提案 + Chunk + Semantic Naming + Classification + Meta Tag 建议，
经 Light Up Proposal→Confirmation 入库，provenance 全程可溯。
