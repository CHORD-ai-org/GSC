# Web Intelligence — Architecture & Component Design

> 逻辑组件：**Web Intelligence（外部信息采集与处理）**。今天内嵌于 GSC Backend 的模块，
> 未来可抽出为独立服务。核心原则：**Pipeline first, Agent later**；**提取（确定性）与整合（LLM）分离**；
> 保留 GSC 信息权威模型（Proposal → Confirmation）。

## 1. 组件边界
```
Source Adapter（提取·确定性）      Information Processing（整合·LLM）
  probe / fetch / extract   →   chunk → propose → detect → propose
        │                                │
        ▼                                ▼
  Source Snapshot（采集版本）        proposals 表 → 用户确认 → items
```
- **Web Capture（提取）**：URL/来源校验 → 抓取 → 结构化提取 → 归一化 → content hash → Snapshot。确定性、可复现，**不耦合 LLM**。
- **Information Processing（整合）**：把 Snapshot 交给 Light Up（复用 `agent/proposer.ts`+`detector.ts`），产出**提案**，保留 provenance。

## 2. Source Adapter 契约（提取侧统一接口）
```ts
// server/intel/adapters/types.ts
export type FetchedDoc = {
  externalId: string;      // 来源内唯一 id（URL / issue# / fileId）
  url: string;             // 归一化 URL 或 locator
  title: string;
  contentText: string;     // 主文本（已规范化）
  author?: string;
  publishedAt?: string;
  siteName?: string;
  description?: string;
  metadata?: Record<string, string>;
  rawHash: string;         // 规范化文本 hash（去重 / 内容变更检测）
};

export type SourceConfig = { label: string; scope: string; token?: string };

export interface SourceAdapter {
  kind: SourceKind;
  probe(cfg: SourceConfig): Promise<{ ok: boolean; message: string }>;
  fetch(cfg: SourceConfig, opts?: { since?: string }): Promise<FetchedDoc[]>;
}
```
每个 `SourceKind` 一个 adapter 文件，向 `server/intel/adapters/index.ts` 的注册表登记。

## 3. 提取 pipeline（`server/intel/extract.ts`）
`URL 校验(SSRF) → fetch(超时/大小/重定向) → 结构化提取 → 归一化 → hash → Snapshot`
- 复用 `ingest/ssrf.ts`（私网/保留段/元数据端点/DNS/每跳重定向复检）与 `ingest/html.ts` 的资源限制。
- 升级 naive `htmlToText` → 结构化 `extractHtml`：title / canonical / author / published / site / description / main text。
- 产出 `Extraction`（含 `contentHash`、`extractorVersion`、`status: ok|unsupported|failed`）。
- **不执行脚本、不信任网页指令**；unsupported（需 JS 渲染/登录）与 failed 明确区分，不假装成功。

## 4. 整合 pipeline（复用 Light Up，不重造）
`Snapshot → chunk（分块）→ proposer（semantic_name/classification/rationale）→ detector（去重/关联/元数据）→ proposals`
- 机器产物一律进 `proposals`（`source=agent|detector`），**不直接写 confirmed 信息**。
- 确认后落 `items`+`item_content`，`origin=machine|import`、`source_label=sync:<kind>:<externalId>`、`source_item_id` 保关联。

## 5. 数据模型迁移（最小、可论证）
只新增 2 张表（Snapshot=采集版本、Task=异步任务，均非现有概念重复）：
```ts
source_snapshots(id, source_id→sources, external_id, url, canonical_url, title,
  content_text, author, published_at, site_name, description,
  content_hash, extractor_version, status, error, retrieved_at,
  UNIQUE(source_id, external_id, content_hash))   // 同源同内容幂等
capture_tasks(id, source_id, kind, url, status, stage, retry_count,
  last_error, created_at, updated_at, claimed_at, completed_at)
```
- **删除语义**：删 Web Source 级联删 snapshots；已确认 Chunk（items）**不**因源删除而消失（其 provenance 留存）。
- 复用 `items`/`item_content`/`proposals`/`sources`，不为每个概念建表。

## 6. 后台任务模型（`capture_tasks` + 进程内 worker）
状态机：`pending → processing → completed | failed | cancelled`。
- 安全 claim（原子占位）、重试上限、超时、失败原因、幂等、worker 中断恢复（claimed 超时回收）。
- **不引入**消息队列 / 分布式工作流引擎；worker 与 API 同部署但职责分离（可后续独立）。

## 7. 安全边界（采集用户提交的 URL = 敏感面）
- **SSRF**：仅 http/https；拒 localhost/私网/保留段/云元数据端点；解析后校验 DNS；每跳重定向复检；限制跳数；防 DNS rebinding。
- **资源限制**：连接/总超时、响应大小上限、重定向上限、content-type 白名单。
- **内容安全**：网页内容为不可信输入；不执行脚本；网页指令不当系统指令；与 Agent 指令隔离。
- **隐私/归属**：owner 隔离（不跨用户暴露 source）；不采集浏览历史/cookie；保留 source 归属。

## 8. 演进与部署（今天内嵌，未来可抽出）
```
GSC Core ──契约── Web Intelligence Service ──► [ Web Capture | Extraction | Processing | Proposal ] ──► GSC Core API
```
- 可独立抽取：`server/intel/**`（capture/extract/adapters）；契约稳定：`FetchedDoc`/`Extraction`/proposal。
- 数据归属 GSC Core（不为部署独立而复制权威库）；未来 worker（capture/render/processing）可横向扩展。
