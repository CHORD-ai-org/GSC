# KNOWN_ISSUES.md — Limitations and Unresolved Problems

Updated: 2026-11-20 (Light Up UX audit recorded).

## Resolved in Phase 01

| Issue | Resolution |
|---|---|
| Local PostgreSQL unavailable | Docker PostgreSQL chosen (`D-004`, `DECIDED`); container not yet started |
| Stack unconfirmed | Vite/React/TS/CSS Modules + `node:http` + Drizzle/PG + Vitest confirmed (`D-005`) |
| Prototype UI placement | standalone app + Overview-style section (`D-010`) |
| Object types unreviewed | five types finalized (`D-006`); Principle/Experience/Taxonomy deferred (`D-011`) |

No unresolved blocker prevents implementation.

## Resolved in Phase 02

| Issue | Resolution |
|---|---|
| Form layout | inline panels; no dialogs (`D-019`) |
| Keyword filter | case-insensitive substring over title + typed text (`D-020`) |
| Stance display | literal `supports` / `challenges` labels with `+` / `−` glyphs (`D-021`) |

## Resolved in Phase 03

| Issue | Resolution |
|---|---|
| Physical schema shape | `D-022` implemented as four tables |
| API contract modules and shapes | `D-023` implemented in `src/lib` and `server/router.ts` |
| Docker ports | API uses `8788`; Docker `55433` remains future-only |
| Test scope | `D-025` implemented: 16 tests + API/UI checks pass |
| Docker daemon unavailable | PGlite fallback active (`D-026`); data persists locally |

## Known gaps by design

| Gap | Reason | Revisit when |
|---|---|---|
| PostgreSQL adapter is not active | Docker daemon unavailable; PGlite fallback active | deployment or Docker availability |
| `ui-prototype/index.html` does not persist | earlier static prototype; live app is now the real client | not applicable |
| No permission system | Explicitly out of MVP | after Phase 05 |
| No semantic search / vector index | Explicitly out of MVP | demonstrated need |
| No WAM, Coworker, or LLM integration | Architectural independence | explicit request |
| No Thylas code changes | D-003 | integration phase |
| No automatic extraction or validation | Out of scope | explicit request |
| No Context Assembly automation | Phase 04 uses explicit assembly | after Phase 04 |
| No graph canvas | relation display is Outgoing/Incoming lists | explicit request |

## Reference-project drift — do not copy stale docs

| Topic | Detail |
|---|---|
| Thylas docs claim no dark mode | code has 3 themes (`src/styles/themes.css:62`) |
| Thylas docs claim IBM Plex Sans UI font | code uses Inter Variable (`src/styles/typography.css:12`) |
| Thylas docs list `--t-page:24/32` | code uses 20/28 |
| Thylas docs propose react-router 8 | code still uses react-router-dom 7.1.1 |
| Thylas `AGENT.md` references lowercase `thinking.md` | actual file is `THINKING.md` (Windows case-insensitive) |

Rule: `THYLAS_REFERENCE.md` records verified values. Re-check code before reusing any Thylas pattern.

## Resolved in Phase 04

| Issue | Resolution |
|---|---|
| Context View not implemented | explicit Knowledge Context with persisted members (`D-027`…`D-029`) |
| Context Space vs View boundary | `CONTEXT_VIEWS.md` |
| Context persistence | `contexts` and `context_members` tables |

## Backend Foundation — known limitations

1. **restore 覆盖模式**（D-074）：本机 safe-delete 钩子拦删除/改名 → restore 退化为「留档+覆盖」；旧关系文件（未知 OID）残留但被 PG 忽略。干净环境走 rename-aside 路径。
2. **幂等/限流为单进程存储**：多实例部署需共享存储（同 M1 限制）。
3. postgres 适配器（O2-5）与软删除（O4-1）按 ROADMAP 时序未做。
4. 迁移无版本表（启动幂等重放，≤10 迁移可靠）；量变时补。

## Light Up redesign — known UX limitations

1. **拆分按内容中部段落边界**（非光标处）——「Split at cursor」为 deferred；语义上仍产生两个诚实的块。
2. **offset 不持久化**：Source 高亮只在本次审阅会话内有效；入库后详情页无原文定位（模型扩展归 PLAN-5 后续）。
3. 机器语义名仅 rule/agent 来源提示，非概率化置信度（按 spec 不编造质量分）。
4. 修复的回归：同源 POST 曾被 CORS 误拒（D-072）—— 已修 + 单测覆盖。

## M1 hardening — documented limitations

1. **限流为单进程内存桶**：多实例部署需共享存储（Redis 等）；X-Forwarded-For 不被信任（需 trust-proxy 配置）。
2. **SSRF 有 DNS-rebinding TOCTOU 窗口**：resolve-then-fetch；彻底关闭需按解析 IP 定制 fetch agent。
3. **GSC_INGEST_ALLOW_PRIVATE=1** 是开发/测试逃生舱，生产必须关闭（strict 模式拦环回/私网/元数据地址）。
4. **密钥是 keyfile 保护而非 HSM**：`.data/secrets.key` 与密文同机；跨机迁移需安全分发密钥。

## PLAN-8 (Meta Tags + User Profile) — open items

1. **C8-1 未做**：Agent 建议标签值（提案制）与 Detector 缺失/矛盾标签检查。标签赋值目前全人工。
2. **`domain` 与 Meta Tag 并存**（D-065）：两套分类机制；未来可将 domain 收编为 Project Association 标签后弃用。
3. 标签作用域的 `project:`/`context:` 前缀目前只存不解析（可见性按 PLAN-7 共享规则走，不按 scope 过滤）。

## Phase 05 — open questions and gaps

| Item | State |
|---|---|
| Visibility enforcement scope (D-063) | items + clusters enforced; contexts / proposals / sources remain single-user surfaces (any valid token in auth mode). PLAN-8 must extend ownership/visibility there. |
| Sharing roles (PLAN-7 B7-2) | only `view` / `add` exist; `edit` / `admin` and cross-user provenance display deferred. |

| Item | State |
|---|---|
| GSC Agent real model calls | proposer is stub-tested only — this environment has no LLM network/key. Set `GSC_LLM_BASE_URL`/`GSC_LLM_API_KEY`/`GSC_LLM_MODEL` in `.env.local` and use 「Agent 建议」 to verify. |
| listItems fields bug (fixed 2026-11-20) | `listItems` previously returned empty `fields` (no content join) — broke content keyword search (D-020) and detector similarity. Fixed; regression covered by detector tests. |

| Item | State |
|---|---|
| GitHub Sync real-network verification | adapter tested with stubbed fetch only — this environment cannot reach api.github.com. Run `Sync now` against a real `owner/repo` + token when network is available. |
| Notion / Drive / X sources (PLAN-3 B3-1) | blocked on OAuth app credentials + network; connect form accepts them but sync returns a contract error until adapters land. Brand logos are letter badges until official assets can be vendored. |
| Migration idempotency | migrations re-run every startup; files 0002–0004 now use `IF NOT EXISTS` — keep new migrations idempotent. |

| Item | State |
|---|---|
| Canvas entry point (Q1) | Default: not a sidebar row; opened from Overview 「画布预览」 and `Ctrl+O`. Overview opens the canvas window (empty state); the empty state's 「画布预览」 activates the card grid. Confirm placement if a sidebar row or separate window is wanted. |
| Sync placement (Q2) | Default: `ORGANIZATION` group (Contexts, Sync). Alternative: bottom cluster with Settings/Documentation. |
| Composer submit without an LLM (Q3) | Captures text as `raw.document` with `source_label` `composer:<mode> · <model>`. Model inference is `DEFERRED` (`D-033`). |
| "Rym" spelling (Q4) | Copied literally from the design board; rename when a real model list exists. |
| Mic button | Visual only; no voice capture. |
| Page-switch mosaic animation | Plays via CSS overlay; not visible in static screenshots (see `ui-prototype/shots/`), verified by code review and build. |
| `favicon.ico` | 404 in dev server console; cosmetic only. |

## Risks to watch in Phase 06

1. Claiming scenario success without observed results.
2. Treating explicit Context Views as dynamic Context Assembly.
3. Adding permissions or Coworker concepts before requested.
4. Silent import of Thylas runtime code or tokens.
5. Adding types or retrieval features not required by scenarios A–D.

## Light Up UX audit — 2026-11-20

These are current implementation gaps found by code review and screenshot inspection. They are not new product scope; see `plans/LIGHT_UP_UX_ARTISTRY.md` for the optimization brief and local-agent prompt.

| Issue | Impact | Required direction |
|---|---|---|
| `isFastPath` is tested but not wired into Composer/Light Up | the stated two-line Enter fast path is not actually implemented | one shared pure rule used by UI and tests |
| Agent suggestions overwrite `row.title`; classification and rationale are discarded | machine interpretation is not visibly separated from user confirmation and does not enter the proposal trail | show suggestions as proposals/decision layers before final persistence |
| Segment persistence is sequential and non-atomic | a failure can leave a partial batch and retry can duplicate items | all-or-none batch persistence with retry-safe behavior |
| Multiple files/segments can share one `sourceLabel` | source provenance is lost or incorrectly merged | carry source metadata per segment |
| Review content is truncated to 400 characters | the original cannot be fully inspected at every step | full-content expandable source/chunk view |
| Proposal queue rows overlap and expose raw UUIDs | review queue is hard to scan and trust | stable layout, target titles, secondary IDs |
| Text-file import creates one row per file without segmentation | conflicts with the long-document chunking promise | segment normalized text per file; state PDF/OCR limits honestly |
| URL extraction ignores the fetched title | strongest naming/provenance cue is discarded | retain title, canonical URL, text and label in the source snapshot |
| `generate()` clears the original input | source context disappears between intake and review | keep an immutable Source Snapshot |
| Draft row keys can collide when batches are appended | edits can target the wrong row | use stable unique draft ids |

Current verification note: `npm run check` passes. `npm test` could not start in the managed sandbox because Vitest/esbuild attempted `spawn EPERM`; this is an environment/tooling limitation, not a recorded test failure. Re-run tests in the approved execution environment before claiming verification.

## 2026-11-22 — 运维与分页过滤两则（V1 执行期发现）

1. **local_user_id 绑定劫持可见性**：`POST /api/users` 首个用户会写入 `local_user_id`
   （storage/settings.ts），此后无 token 请求以该用户为 viewer，其名下无数据时 `/api/items`
   列表为空（total 有数、items 空）。历史 hint 检查脚本（`.workbuddy/tmp/hint-*.mjs`）会走
   onboarding 创建新用户并可能改写绑定。恢复法：DELETE 该用户自动解绑。
2. **可见性过滤在分页之后**：`GET /api/items` 先取页再按 visibleItemIds 过滤，某页全为
   不可见条目时出现「items 空但 next_cursor 非空」的假空页。多用户数据共存时影响观感；
   属既有行为（T202 分页 + PLAN-7 可见性叠加），修法是过滤下推到查询层（后续择机处理）。

## 2026-11-23 — 决策号撞号（双并行流独立追加，已修复）

两条并行工作流（Phase 07 里程碑流 / UI-后端优化流）各自向 DECISION_LOG.md 追加决策，出现
D-092、D-093 双占。已将 Phase 07 侧的两条重编号为 **D-097**（V4 集成验收）与 **D-098**（M5），
并在条目内注明原号。注意：优化流的 D-095 与 D-097 记录同一 V4 里程碑（各线视角）。
防复发：追加决策前先 grep 号段最大值，或改用带前缀的号（如 P7-xx / OPT-xx）。

## 2026-11-23 — PGlite 强杀损坏事故（已恢复为新库）

`taskkill /F` 强杀 API 进程导致 `.data/pglite` 损坏（残留 postmaster.pid + 深层损坏，WASM 库
Abort 拒启）。已保全残骸 `.data/pglite.corrupt-20261123`（**未删**），开发库迁至 `.data/pglite-v2`
重建；17:47 前的开发数据不可恢复（11-20 有旧备份 `pglite.replaced-*` 但太旧）。教训与对策：
① 停 API 用温和方式（让进程自然退出/关 stdin），别 kill -F；② PGlite 是单写者，进程被并行
脚本（如 ui-checks.mjs）同时打开也会冲突——**这正是 LOCAL_SIM 走 Docker PG 的直接理由**，
compose 起套后开发/模拟都不再碰 PGlite。
