# IMPLEMENTATION_STATUS.md — What Actually Works

Updated: 2026-11-22 (registration receipt demo implemented, D-089).

## 1. Current phase

| Phase | State | Evidence |
|---|---|---|
| 00 — Inspection & foundation | COMPLETE, reviewed 2026-11-16 | 12 documents created; Phase 00 report delivered |
| 01 — Information model & taxonomy | COMPLETE, 2026-11-16 | `INFORMATION_MODEL.md` finalized + 3 new taxonomy/model documents |
| 02 — MVP interaction design | COMPLETE, 2026-11-16 | `MVP_USER_FLOWS.md`, `MVP_UI_SPECIFICATION.md`, static UI prototype |
| 03 — Core implementation | COMPLETE, 2026-11-18 | app, API, PGlite persistence, tests and verification pass |
| 04 — Context views | COMPLETE, 2026-11-19 | explicit Knowledge Context, member add/remove, persistence and UI |
| 05 — UI shell & interaction layer | IMPLEMENTED, 2026-11-19 | light shell, Overview+Composer, Canvas, Sync, Settings, animations; see §4 checks |
| 06 — Evaluation & integration prep | NOT STARTED | no evaluation (former Phase 05, renumbered by D-030) |

## 2. Implemented capabilities

| Capability | Status |
|---|---|
| Persistent raw information | IMPLEMENTED |
| Structured objects | IMPLEMENTED |
| Relationships | IMPLEMENTED |
| Provenance / history | IMPLEMENTED |
| Browse / filter | IMPLEMENTED |
| Context views | IMPLEMENTED — explicit Knowledge Context membership |
| Registration receipt demo | IMPLEMENTED — self-written ReceiptPrinter, tearable receipt after create account (D-089) |
| Persistence layer | IMPLEMENTED — PGlite |
| Validation | IMPLEMENTED — shared contract checks |
| Tests | IMPLEMENTED — 16 tests pass |
| Thylas integration | NOT IMPLEMENTED (intentionally out of scope) |

## 3. Files created or changed in Phase 00

| File | Change |
|---|---|
| `README.md` | rewritten from 2-line stub |
| `THINKING.md` | new — standing task record |
| `AGENTS.md` | new — handoff rules |
| `PROJECT_CONTEXT.md` | new |
| `PRODUCT_VISION.md` | new |
| `INFORMATION_MODEL.md` | new — `PROPOSED` draft |
| `DESIGN_BOUNDARIES.md` | new |
| `THYLAS_REFERENCE.md` | new — audited facts with paths |
| `DEVELOPMENT_ROADMAP.md` | new — Phase 00–05 + Phase 01/02 task cards |
| `IMPLEMENTATION_STATUS.md` | new |
| `DECISION_LOG.md` | new |
| `KNOWN_ISSUES.md` | new |

No files under `D:\github projects\Thylas` were modified.

### Phase 01

| File | Change |
|---|---|
| `INFORMATION_MODEL.md` | rewritten: `DECIDED`, shared metadata, status vocabulary, provenance/history, Context View rule |
| `RAW_INFORMATION_TAXONOMY.md` | new — 4 raw types, import behavior, storage and immutability rules |
| `STRUCTURED_OBJECT_TAXONOMY.md` | new — 5 object types with required/optional fields |
| `RELATIONSHIP_MODEL.md` | new — 5 relation kinds, constraints, display rule, provenance reconstruction |
| `DECISION_LOG.md` | D-004/005/006/007/008/010 closed; D-013…D-016 added |
| `DEVELOPMENT_ROADMAP.md` | Phase 00/01 marked complete; Phase 02 dependencies updated |
| `THINKING.md`, `README.md`, `PRODUCT_VISION.md`, `THYLAS_REFERENCE.md`, `KNOWN_ISSUES.md` | status and reference updates |

### Phase 02

| File | Change |
|---|---|
| `MVP_USER_FLOWS.md` | new — F1–F8, navigation hierarchy, 4 scenario walks |
| `MVP_UI_SPECIFICATION.md` | new — S1–S7, tokens, components, D-019/020/021 |
| `ui-prototype/index.html` | new — self-contained interactive prototype, in-memory only |
| `DECISION_LOG.md` | D-019/D-020/D-021 added; no `OPEN`/`PROPOSED` left at end of Phase 02 |
| `RELATIONSHIP_MODEL.md`, `INFORMATION_MODEL.md` | display rule and open-item sections finalized |
| `DEVELOPMENT_ROADMAP.md`, `THINKING.md`, `README.md` | Phase 02 marked complete |

### Phase 03

| File | Change |
|---|---|
| `package.json`, `package-lock.json` | dependencies and npm scripts |
| `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.env.example` | scaffold |
| `src/lib/{api,items,relations,events}.ts` | shared contracts and validation |
| `src/services/api.ts`, `src/app/App.tsx`, `src/app/app.module.css`, `src/components/ui.tsx`, `src/styles/*` | live React app |
| `server/{config,http,router,index}.ts` | `node:http` API |
| `server/persistence/{schema,client,migrate,reset}.ts`, `migrations/0000_init.sql` | Drizzle schema + PGlite persistence |
| `server/repo/{items,relations,events}.ts`, `server/storage/local.ts` | data access and local file storage |
| `src/lib/contracts.test.ts`, `server/router.test.ts`, `server/persistence/roundtrip.test.ts` | 16 tests |
| `scripts/{api-checks,db-check}.mjs` | verification commands |
| `DECISION_LOG.md` | D-022…D-025 `DECIDED`; D-026 added |

### Phase 04

| File | Change |
|---|---|
| `PHASE_04_PLAN.md` | new — P4-0…P4-4 task cards and verification gates |
| `CONTEXT_VIEWS.md` | new — Context Space vs Context View boundary |
| `src/lib/contexts.ts` | new — context DTOs and validation |
| `server/repo/contexts.ts` | new — context create/update/list/get and explicit membership |
| `server/persistence/schema.ts`, `migrations/0001_contexts.sql` | contexts + context_members tables |
| `server/persistence/migrate.ts` | applies all SQL migrations |
| `server/router.ts`, `src/services/api.ts` | context API and client service |
| `src/app/App.tsx`, `app.module.css` | Contexts view, member add/remove, open member detail |
| tests and smoke scripts | context contract, repo, route, API smoke coverage |
| docs | README/ROADMAP/STATUS/KNOWN_ISSUES/THINKING/DECISION_LOG updated |

### Phase 05

| File | Change |
|---|---|
| `ui-prototype/refs/` | 4 design screenshots + README mapping (saved from user clipboard) |
| `PHASE_05_UI_PLAN.md` | new — P5-0…P5-6 task cards, milestones, verification matrix, Q1–Q4 |
| `src/styles/tokens.css`, `src/styles/base.css` | light theme tokens (D-031) |
| `src/app/Sidebar.tsx`, `src/app/shell.module.css`, `src/components/GscLogo.tsx` | new — sidebar nav (real option list + Sync, D-032); logo = official mark traced from `ui-prototype/refs/05-logo-official.png` via `scripts/logo-trace.mjs` (53 exact rects) |
| `src/app/Composer.tsx` | new — Ask anything composer (Ask/Agent/Edit, Local, Deepseek/Rym, mic, submit) |
| `src/app/CommandBar.tsx` | new — canvas command bar (搜索或输入操作, +, panel toggle) |
| `src/views/views.tsx`, `src/views/views.module.css` | new — Overview, Canvas (empty state + card grid), Sync, Settings, Documentation |
| `src/lib/prefs.ts` | new — UI prefs (animation quality, page transition, model) persisted in localStorage |
| `src/lib/sync.ts`, `src/lib/sync.test.ts` | new — JSON / Markdown bundle / Claude Code·Codex export builders + 3 tests |
| `src/components/animations.tsx`, `animations.module.css` | new — mosaic page transition + mouse dot-grid background (D-034) |
| `src/app/App.tsx`, `app.module.css`, `src/components/ui.module.css` | shell routing, view migration, composer/file-import wiring, light restyle |
| `scripts/ui-shots.mjs`, `scripts/ui-smoke.mjs`, `scripts/ui-debug.mjs` | new — CDP screenshot and smoke tooling |

## 4. Verification performed

| Check | Command / method | Result |
|---|---|---|
| GSC initial contents | `find .` excluding `.git` | 3 files: `.gitattributes`, `LICENSE`, `README.md` |
| Git state | `git status --short --branch` | `## main...origin/main`, clean |
| Commit history | `git log --oneline -5` | `2498493 Initial commit` |
| Thylas access | directory listing + two independent read-only audits | accessible; no fabrication needed |
| GSC presence in Thylas | full grep for `gsc|GSC` in `src/` | 0 hits |
| Thylas GSC docs | directory listing of `docs/product/gsc/` | only `MANIFESTO.md` |
| Local runtime | `node --version`, `npm --version` | v22.22.2 / 10.9.7 |
| Local PostgreSQL | TCP checks on 5432 and 55432 | both closed |
| `psql` | `command -v psql` | not found |
| Docker | `docker --version` | 29.1.5 |
| pnpm | `command -v pnpm` | not found |

### Phase 01 checks

| Check | Method | Result |
|---|---|---|
| Documentation set | `ls -1 *.md` | 15 markdown files present |
| Decision states | grep `^- \*\*Status:\*\*` in `DECISION_LOG.md` | At end of Phase 02: 16 entries, 15 `DECIDED`, 1 `DEFERRED`; no `OPEN`/`PROPOSED` left |
| Scenario coverage | read type tables in both taxonomy docs | 4 raw types and 5 object types each map to ≥1 scenario A–D |
| No orphan types | read scenario tables | every retained type is reachable by a user action; no universal ontology added |
| No code claimed | `git status --short` | only documentation, `.gitignore`, `.workbuddy/`, `ui-prototype/` untracked/modified |

### Phase 02 checks

| Check | Method | Result |
|---|---|---|
| Prototype script syntax | extract inline `<script>` → `node --check` | pass |
| Library screen render | headless Chrome CDP, 1440×900 screenshot | header + 8 rows + detail panel; no overlap |
| New form render | click `[data-action=new]` → screenshot | type selector, shared fields, typed fields, Save/Cancel visible |
| Contexts screen render | click `[data-view=context]` → screenshot | subject/scope/purpose, 4 explicit members, add picker |
| Screenshot dimensions | PNG header bytes 16–23 | 1440×900 |
| Workflow coverage | read `MVP_USER_FLOWS.md` | all 8 required workflows + 4 scenarios described |

The Phase 02 statement above is historical; Phase 03 verification follows.

### Phase 03 checks (2026-11-18)

| Check | Command / method | Result |
|---|---|---|
| Types | `npm run check` | pass |
| Tests | `npm test` | 3 files, 16 tests pass |
| Build | `npm run build` | pass; `dist/` generated |
| DB | `npm run db:migrate` + `node scripts/db-check.mjs` | 4 tables: events, item_content, items, relations |
| API smoke | `npm run api:check` | 6 checks pass |
| Vertical slice | API smoke + detail screenshot | raw → concept → derived_from → detail/history |
| File import | POST `raw.filecontent` | file stored at `data/files/<id>.txt`; DB stores relative ref |
| UI render | headless Chrome, 1440×900 | Library, detail, New form render with live API data |
| UI defect fix | screenshot review + CSS patch | top bar/nav alignment fixed |
| Restart | stop + restart API, query `/api/items?q=Smoke` | 2 items persisted |
| No JSONB | `grep -c jsonb server/persistence/schema.ts` | 0 |

### Phase 04 checks (2026-11-19)

| Check | Command / method | Result |
|---|---|---|
| Types | `npm run check` | pass |
| Tests | `npm test` | 3 files, 20 tests pass |
| Build | `npm run build` | pass |
| DB | `npm run db:migrate` + `node scripts/db-check.mjs` | 6 tables |
| API smoke | `npm run api:check` | 10 checks pass |
| Context repo | round-trip test | explicit add/remove/duplicate/update pass |
| UI render | headless Chrome 1440×900 | Contexts list, context detail, 2 members, add picker render |
| Member detail | click member row in screenshot flow | right panel shows item detail, relations and history |
| Restart | API restart + GET context | context and members persist |

### Phase 05 checks (2026-11-19)

| Check | Command / method | Result |
|---|---|---|
| Types | `npm run check` | pass |
| Tests | `npm test` | 4 files, 23 tests pass (20 + 3 new sync export tests) |
| Build | `npm run build` | pass |
| API smoke | `npm run api:check` | 10 checks pass |
| UI screenshots | `node scripts/ui-shots.mjs http://localhost:5174/` | 8 shots at 1440×900 in `ui-prototype/shots/`: Overview+composer, Raw Information, Structured Objects, Contexts, Sync, Settings, Canvas empty, Canvas preview |
| Design fidelity | screenshot review vs `ui-prototype/refs/` | sidebar groups match the spec board; composer matches the mock (Agent pill, Local, Deepseek, mic, black submit); Settings quality selector matches Off/Low/Medium/High/Max reference; canvas empty state matches 04 (搜索或输入操作 / 画布预览 / 打开文件… Ctrl O) |
| Composer E2E | `node scripts/ui-smoke.mjs` | typed text → submit → `raw.document` created → appears in Recently (SMOKE PASS) |
| Animation settings | Settings quality pills + transition toggle | state persists in `localStorage` (`gsc.ui.prefs.v1`); default Medium, transition On |
| Export builders | `src/lib/sync.test.ts` | JSON round-trip, Markdown relations/history, GSC-CONTEXT.md agent sections pass |
| Note | screenshot tooling | headless Chrome needs `--disable-gpu --no-sandbox --hide-scrollbars` or captures come back blank (fixed in `scripts/ui-shots.mjs`) |

### Phase 05 additions (2026-11-19 evening)

| Check | Command / method | Result |
|---|---|---|
| Official logo | `scripts/logo-trace.mjs` on `ui-prototype/refs/05-logo-official.png` | 53 rects, exact area coverage; `GscLogo.tsx` replaced; sidebar + Overview screenshots match the official mark |
| Dark mode (D7, `D-036`) | `npm run check` / `npm run build` / `npm test` | pass; 23 tests |
| Dark render | `node scripts/ui-shots.mjs http://localhost:5174/ dark` | 8 dark shots in `ui-prototype/shots/dark-*.png`; logo inverts via `currentColor`; pills/selection invert (accent white + `--on-accent` dark); dot-grid and mosaic tiles theme-aware |
| Theme persistence | Settings → Dark → reload | `gsc.ui.prefs.v1` keeps `theme`; `[data-theme='dark']` applied on load |

### Layout v2 (2026-11-19 night, `UI_LAYOUT_PLAN.md` L1–L6)

| File | Change |
|---|---|
| `UI_LAYOUT_PLAN.md` | new — L1–L7 task cards, two page modes, milestones |
| `src/pages` → `src/views/pages.tsx` | StartView (composer home, renamed), OverviewPage (space entry), RecentlyPage (time groups + visited/updated), SettingsPage (secondary nav) |
| `src/views/collections.tsx` | new — RawCollection / ObjectCollection / ContextCollection (Collection View) |
| `src/views/detail.tsx` | new — RawDetailView / ObjectDetailView / ContextDetailView (Object Detail View) |
| `src/lib/format.ts`, `src/lib/visits.ts` | new — relative time / time groups; client-side visit log |
| `server/repo/items.ts`, `server/router.ts`, `src/services/api.ts` | `DELETE /api/items/:id` with FK cascade; `api.deleteItem` |
| `src/app/App.tsx`, `Sidebar.tsx`, `views.tsx`, `views.module.css` | routing (Start/Overview/Recently), relation index, source counts, delete flow |
| `scripts/ui-shots.mjs` | list→detail→back flow; 13 shots per theme |

### Layout v2 checks (2026-11-19)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass |
| Tests | `npm test` | 24 tests pass (incl. delete cascade: item + relations/events gone, 404 on repeat) |
| API smoke | `npm run api:check` | 10 checks pass |
| Screenshots | `node scripts/ui-shots.mjs http://localhost:5174/ light` + `dark` | 13 shots per theme in `ui-prototype/shots/` |
| Fidelity | screenshot review vs `UI_LAYOUT_PLAN.md` §2 | Overview = header + 3 counts + Recently Updated + Your Contexts; Raw/Object detail = required blocks verbatim (raw content not summarized); Context detail = Definition above / Members below; Recently = time groups + 访问/修改 tags; Settings = secondary nav |
| Dark spot-check | `dark-07-object-detail.png` | new pages theme-aware |

### PLAN-1 execution (2026-11-20, A/B stages)

| File | Change |
|---|---|
| `PRODUCT_VISION.md` | Vision v0.2 (user-supplied) |
| `plans/` | PLAN-1…PLAN-8 + README (vocabulary map) |
| `INFORMATION_MODEL.md` | §11 terminology alignment, §12 Cluster, §13 proposal layer |
| `server/persistence/migrations/0002_clusters.sql`, `0003_proposals.sql` | clusters + cluster_members + proposals tables |
| `server/persistence/schema.ts`, `server/repo/clusters.ts`, `server/repo/proposals.ts` | Drizzle tables and repositories |
| `src/lib/clusters.ts`, `src/lib/proposals.ts` | contracts + validators |
| `server/router.ts`, `src/services/api.ts` | `/api/clusters*` + `/api/proposals*` endpoints and client |
| `src/views/collections.tsx`, `detail.tsx`, `pages.tsx`, `src/app/App.tsx`, `Sidebar.tsx` | Clusters collection/detail/forms, sidebar entry, Overview "Existing Clusters" |
| `scripts/api-checks.mjs`, `scripts/ui-shots.mjs` | 12 smoke checks; mount-wait before clicking (cold-load fix) |

### PLAN-1 checks (2026-11-20)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass |
| Tests | `npm test` | 26 tests pass (2 new: cluster CRUD + multi-membership; proposal lifecycle) |
| API smoke | `npm run api:check` | 12 checks pass (cluster member + proposal resolve added) |
| Screenshots | `node scripts/ui-shots.mjs http://localhost:5174/ light` | 15 shots; `14-clusters-list` / `15-cluster-detail` verified vs D-045; pixel probe confirms theme consistency across the set |
| Tooling note | `ui-shots.mjs \| head` | piping to `head` closes stdout early (SIGPIPE) and kills the run mid-way, mixing files from two runs — never truncate its output |

### PLAN-2 execution (2026-11-20, A2-1/B2-1/B2-2)

| File | Change |
|---|---|
| `src/lib/lightup.ts`, `lightup.test.ts` | normalization, rule segmentation (paragraphs / headings / rules, tiny-fragment merge), semantic-name suggestion, fast-path rule + 5 tests |
| `server/ingest/html.ts` | URL fetch (10s/2MB) + naive HTML→text/title extraction |
| `server/router.ts` | `POST /api/ingest/url` — fetch-and-preview only (D-048) |
| `src/views/lightup.tsx` + `views.module.css` | Light Up workspace: Manual tab (old New form) + pipeline tab (URL/clipboard/multi-file intake → segment review rows → batch persist) |
| `src/app/App.tsx`, `src/views/pages.tsx` | `lightup` view; entries: Raw `+ Add`, Overview `+ New`, Start quick action 「Light Up」 (D-046); batch create with source_label provenance |
| `src/services/api.ts` | `ingestUrl` client |

### PLAN-2 checks (2026-11-20)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass |
| Tests | `npm test` | 32 tests pass (5 lightup rules + 1 URL-ingest route incl. preview-only assertion) |
| API smoke | `npm run api:check` | 12 checks pass |
| Screenshots | `ui-prototype/shots/16-lightup-manual.png`, `17-lightup-review.png` | manual form tab renders; pipeline intake + 2 review rows (titles derived, keep/type/preview) + 「入库 2 条」 verified |

### PLAN-3 execution (2026-11-20, A3-1/A3-2)

| File | Change |
|---|---|
| `server/persistence/migrations/0004_sources.sql`, `schema.ts` | sources table (kind/label/scope/status/frequency/last_sync/last_error) |
| `server/storage/secrets.ts` | token store at `.data/secrets.json` (gitignored; D-050) |
| `server/repo/sources.ts`, `server/sync/github.ts` | source CRUD + GitHub adapter (issues → raw items, `sync:github:owner/repo#n`, dedupe by source_label) |
| `server/router.ts` | `/api/sources*` + `POST /api/sources/:id/sync` (github only; others return contract error until B3-1) |
| `src/lib/sources.ts`, `src/services/api.ts` | contracts + client |
| `src/views/views.tsx` | new SyncView (source cards: identity/status/scope/last-sync/frequency + Sync now/pause/disconnect) ; old export page renamed `ExportView` |
| `src/app/Sidebar.tsx`, `App.tsx` | sidebar ORGANIZATION gains Export (D-049); sources state + handlers |
| migrations 0002–0004 | `IF NOT EXISTS` added — migrate re-runs all files every startup |

### PLAN-3 checks (2026-11-20)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass |
| Tests | `npm test` | 35 tests pass (3 new: adapter import+dedupe, sync outcome recording, token outside DB) |
| API smoke | `npm run api:check` | 12 checks pass |
| Screenshots | `ui-prototype/shots/18-sync-sources.png`, `19-export.png` | connect form + source card (six elements) + Export page render |
| Real-network note | api.github.com unreachable in this environment | GitHub sync verified with stubbed fetch; real-source verification pending (KNOWN_ISSUES) |

### PLAN-4 execution (2026-11-20, A4-1/B4-1/B4-2)

| File | Change |
|---|---|
| `src/lib/proposals.ts` | kinds +`dedupe`/`metadata`; `isApplicableProposalKind` (D-054) |
| `server/config.ts`, `.env.example` | `GSC_LLM_BASE_URL/API_KEY/MODEL` (D-052) |
| `server/agent/llm.ts` | OpenAI-compatible chat adapter + JSON extraction |
| `server/agent/proposer.ts` | GSC Agent: semantic name / classification suggestions with quoted rationale |
| `server/agent/detector.ts` | Detector: dedupe (word-set similarity ≥0.8), association candidates, provenance-gap findings; skips already-pending |
| `server/repo/proposals.ts` | `resolveProposalApplying` — accept semantics per kind (D-054) |
| `server/router.ts` | `POST /api/agent/propose`, `POST /api/agent/detect`; resolve route applies via repo |
| `src/views/lightup.tsx`, `pages.tsx` | 提案队列 tab (accept/reject, resolve-only notes, 运行 Detector) + 「Agent 建议」fills review rows; Overview「Review Queue」section |
| `server/repo/items.ts` | **fix:** `listItems` joins item_content — fields were empty (broke content keyword filter D-020 and detector similarity) |

### PLAN-4 checks (2026-11-20)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass |
| Tests | `npm test` | 41 tests pass (6 new: detector dedupe 100% on constructed pairs, pending-dedupe, similarity, JSON extraction, accept→title+history, reject→no-op) |
| Detector live | `POST /api/agent/detect` on dev DB | 82 candidates (36 dedupe / 36 association / 10 metadata) |
| Screenshots | `ui-prototype/shots/20-review-queue.png` | queue tab with rows, accept/reject, resolve-only notes verified |
| LLM note | no network/key in this environment | proposer verified with stub only; real calls pending `GSC_LLM_*` config (KNOWN_ISSUES) |

### PLAN-5 execution (2026-11-20, A5-1/B5-1/B5-2)

| File | Change |
|---|---|
| `src/styles/tokens.css` | semantic dictionary `--sem-original/confirmed/machine/alert` (both themes, D-055) |
| `src/components/SemTag.tsx` + `semtag.module.css` | SemTag chips + legend + neutral MemberBadge (D-057) |
| `src/lib/activity.ts` + `activity.test.ts` | day buckets (created/updated/pending) + test |
| `src/components/ActivityMap.tsx` + `activity.module.css` | 12-week density map, segment colors per dictionary, click-to-filter (D-056) |
| `src/views/detail.tsx` | 原文/语义 identity chips on blocks; ⇄ 配对芯片 (raw↔object pairing, D-057 B5-2) |
| `src/views/collections.tsx`, `pages.tsx`, `App.tsx` | row membership badges; Overview activity section + legend; Recently day-filter chip |

### PLAN-5 checks (2026-11-20)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass |
| Tests | `npm test` | 42 tests pass (1 new: activity bucketing) |
| Screenshots | `02-overview.png` (legend + density map + 本周新增/待审 counts), `05-raw-detail.png` (原文 chip + pairing chip), `06-objects-list.png` (row badges) | verified |
| Accessibility | SemTag always renders text labels | color never sole encoding (D-055) |

### PLAN-6 execution (2026-11-20, A6-1/A6-2/B6-1/B6-2-TS)

| File | Change |
|---|---|
| `API_CONTRACT.md` | v1 surface frozen (endpoints, error kinds, consumers) |
| `server/storage/tokens.ts` + `tokens.test.ts`, `scripts/create-token.mjs` | PAT tokens (sha256 at rest, read/rw scopes, mint/revoke) |
| `server/router.ts`, `server/config.ts` | `/api/v1/*` canonical (bare `/api/` alias), auth gate on `GSC_AUTH_REQUIRED=1` |
| `server/mcp/index.ts` + `mcp.test.ts` | stdio MCP server (initialize/tools/list/tools/call; 6 tools) backed by the HTTP API |
| `sdk/gsc.mjs` + `sdk/README.md` | single-file fetch client (listChunks/getChunk/search/clusters/contexts/propose) |
| `DESIGN_BOUNDARIES.md` | amendment: minimal token auth in scope (D-058) |
| `package.json` | `npm run mcp` |

### PLAN-6 checks (2026-11-20)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass |
| Tests | `npm test` | 46 tests pass (4 new: MCP handshake/tools/route/errors, token mint-verify-revoke) |
| MCP live smoke | `printf jsonrpc \| node server/mcp/index.ts` against live API | init `gsc-mcp`, 6 tools listed, `gsc_list_chunks` returned 9 items via `/api/v1/` |
| Auth | unit (tokens.test.ts) | read/rw scopes verified; wrong token → null; revoke effective |

### PLAN-7 execution (2026-11-20, A7-1/B7-1)

| File | Change |
|---|---|
| `server/persistence/migrations/0005_users_shares.sql`, `schema.ts` | `users` (seeded `usr_local`), `owner_id` on items/clusters, `cluster_shares`, `cluster_share_events` |
| `server/repo/users.ts` | users CRUD, share grant/revoke + audit rows, `shareFor` |
| `server/repo/{items,clusters}.ts`, `server/storage/tokens.ts` | owner stamping on create; tokens bind `userId` |
| `server/router.ts` | viewer resolution; item visibility (owner + shared-cluster members); owner-only mutations; cluster share rules (view/add/owner); `/api/users`, `/api/clusters/:id/shares*` |
| `src/services/api.ts`, `src/views/detail.tsx`, `src/app/App.tsx` | share panel in ClusterDetailView (invite by user, view/add roles, revoke) |
| `DESIGN_BOUNDARIES.md` | amendment 2: ownership + cluster sharing in scope (D-061…D-063) |

### PLAN-7 checks (2026-11-20)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass |
| Tests | `npm test` | 47 tests pass (1 new scenario: A shares→B reads member chunk only, private invisible, view cannot mutate/add, revoke instant, audit granted+revoked) |
| UI | `ui-prototype/shots/15-cluster-detail.png` | Sharing block with user picker, role select, Bob·view row + 回收 verified |

### PLAN-8 execution (2026-11-20, A8-1/B8-1/B8-2)

| File | Change |
|---|---|
| `server/persistence/migrations/0006_meta_tags.sql`, `schema.ts` | `tag_definitions` + `tag_values` (scope, confirmed, owner_id); 6 Vision §5.4 dimensions pre-seeded idempotently |
| `src/lib/tags.ts` | three-layer contract, scope validation, controlled-definition rule, preset dimension table |
| `server/repo/tags.ts` | definition CRUD, value create/confirm/delete, unknown-definition refusal |
| `server/router.ts` | `/api/tags/definitions`, `/api/tags/values` (+PATCH/DELETE), read-only `/api/profile` (confirmed-only, D-066) |
| `server/mcp/index.ts` | `gsc_get_user_profile` tool → `/api/v1/profile` |
| `src/components/TagEditor.tsx` | assignment block: dimension select, free value, scope, confirm/remove |
| `src/views/{detail,pages,collections}.tsx` | Meta Tags block in Raw/Object detail; Settings → Meta Tags (definitions + User Profile aggregation + new dimension); tag-dimension filter in Raw/Objects collections; Overview Meta Tags summary |
| `src/app/App.tsx` | tag state, loaders, handlers, derived indexes (tagDimsByItem/tagDimNames/tagSummary) |

### Background animation fix (2026-11-20)

Dot-grid background is now **empty at rest**: nothing renders until the pointer moves inside the window, only the cells around the cursor fade in (smoothstep falloff within a quality-dependent radius), and the effect fades out after ~2.2s idle or when the pointer leaves. Verified via CDP with `Input.dispatchMouseEvent`: `anim-1-rest.png` (clean background) and `anim-2-hover.png` (localized dash cluster around the cursor only).

### Backend Foundation Phases 00–06 (2026-11-20)

| Phase | Deliverable | Evidence |
|---|---|---|
| 00 Audit | `BACKEND_CURRENT_STATE.md` | constraint/test/API sweep; 4 proposed changes with six-element analysis |
| 01 Domain/DB | `DOMAIN_MODEL.md`, `DATABASE_DESIGN.md`, `PROVENANCE_MODEL.md`, `API_DESIGN.md` | decisions D-042…D-074 cross-referenced; spec §3 provenance questions answered |
| 02 Hardening | idempotency (items/relations/resolve), 0007 (idempotency_keys + tag_values unique), `db:backup`/`db:restore`, `server/{log,idempotency}.ts` | `hardening.test.ts` 2/2; 73 tests total; restore drill passed (deleted item recovered) |
| 03 Cluster | verified existing | `router.test.ts` multi-home + `sharing.test.ts` |
| 04 Meta Tags | verified existing + uniqueness | `tags.test.ts` + `hardening.test.ts` |
| 05 API readiness | `SECURITY_MODEL.md`, `BACKEND_ROADMAP.md` | 12 api-checks; auth probes (401/403) |
| 06 Verification | check/build/73 tests/api:check green | this table |

### Backend Foundation checks (2026-11-20)

| Check | Method | Result |
|---|---|---|
| Idempotent create | POST /items with same Idempotency-Key ×2 + body mismatch | same id replayed; mismatch 409; no duplicates; headerless unchanged |
| Tag uniqueness | duplicate (def,item,value,scope) | 409 conflict; different scope allowed |
| Backup/restore drill | backup → create → delete → stop → restore → restart → GET | deleted item RESTORED |
| Logging | X-Request-Id on responses | present; denylist covers title/content/token |
| Suite | `npm test` | 73 pass |

### Light Up UX redesign (2026-11-20, D-071/D-072)

| File | Change |
|---|---|
| `src/views/lightup.tsx` | rewritten as `LightUpStudio`: Capture→Understand→Shape→Curate→Illuminate with stage kicker |
| `src/components/SemanticObjectSheet.tsx` | new — Semantic Object Sheet (prominent semantic name, provenance, original excerpt, pending tags, curation actions) |
| `src/views/lightup.module.css` | new — editorial typography system (Quiet Intelligence × Editorial Craft) |
| `src/lib/lightup.ts` | `Segment` gains offset spans + `nameOrigin`; `mergeSegments`/`splitSegment` |
| `src/app/App.tsx` | `persistSegments` returns `{created, failed}` with per-item isolation; pending tags → `/api/tags/values` on persist |
| `server/router.ts`, `vite.config.ts` | CORS same-origin fix (D-072): Origin===Host allowed; vite proxy `changeOrigin:false` |
| docs | `LIGHT_UP_CURRENT_STATE.md`, `LIGHT_UP_UX_VISION.md`, `LIGHT_UP_INTERACTION_SPEC.md`, `LIGHT_UP_IMPLEMENTATION_PLAN.md` |

### Light Up checks (2026-11-20)

| Check | Method | Result |
|---|---|---|
| Tests / build | `npm test` / `npm run build` | 71 pass (+1 CORS regression), build ok |
| Full flow | CDP capture `lu-1…lu-9` | Capture(drag/URL banner) → Understand stages → Shape(3 sheets) → Source highlight → Overview → bulk accept → Illuminate(3 created) |
| Persistence | API query after flow | 3 chunks persisted with titles/types/source_label |
| Narrow viewport | 720×900 capture `lu-9` | layout stacks cleanly, no clipping |
| CORS bug | D-072 regression test + live browser fetch | same-origin POST now 201 (was 403) |

### GLOBAL_OPTIMIZATION M1 — backend hardening (2026-11-20)

| File | Change |
|---|---|
| `src/lib/api.ts` | error kinds +401/403/405/413/429 mappings; `INPUT_LIMITS` |
| `server/http.ts` | `ApiFailure` typed throws; malformed JSON → 400, oversized body → 413; security headers on every response |
| `server/router.ts` | auth 401/403; 405 + `Allow` route table; CORS allowlist + preflight; rate-limit gate |
| `server/ratelimit.ts` (+test) | token-bucket: write 60/min, ingest 10/min, agent 5/min |
| `server/ingest/ssrf.ts` (+test), `html.ts` | SSRF guard: address classification, DNS check, per-hop redirect re-validation |
| `server/repo/{items,proposals}.ts` | multi-write operations wrapped in drizzle transactions (O1-4) |
| `server/storage/secrets.ts` (+test) | AES-256-GCM at rest, keyfile/`GSC_SECRETS_KEY`, legacy plaintext migration |
| `server/agent/detector.ts` | `planComparisons` inverted-index candidate gate (O5-2) |
| `API_CONTRACT.md` | error table + cross-cutting semantics documented |

### M1 checks (2026-11-20)

| Check | Command / method | Result |
|---|---|---|
| Tests | `npm test` | 67 pass (+18 hardening) |
| Eval probes | `eval-probe.mjs` live | 15/15 (malformed JSON now 400) |
| Rate limit | 13 rapid ingest posts | 10 pass-through → 429 + `Retry-After: 5` |
| Security headers | curl -D | nosniff / DENY / no-referrer present |
| Secrets at rest | secrets.test.ts | ciphertext only on disk; wrong key fails closed |

### PLAN-8 checks (2026-11-20)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass |
| Tests | `npm test` | 49 tests pass (1 new: seeds 6 dimensions, refuses unknown definition, scope validation, profile confirmed-only round-trip) |
| MCP | live `tools/call gsc_get_user_profile` | returns only confirmed User Profile values via `/api/v1/profile` |
| UI | `shots/07-object-detail.png` (Meta Tags block), `21-settings-tags.png` (definitions + User Profile + NEW DIMENSION), `22-overview-bottom.png` (Meta Tags summary) | verified |

### Routing system checks (D-078, 2026-11-21)

| Check | Command / method | Result |
|---|---|---|
| Types / build | `npm run check` / `npm run build` | pass (0 errors) |
| Tests | `npm test` | 110 pass (10 new: routes round-trip, matchPath, params, query, 404) |
| Deep link | `shots/routing-raw-list.png` (`/raw`) | Raw list renders from URL ✓ |
| 404 | `shots/routing-notfound.png` (`/nope`) | 404 + "返回首页" ✓ |
| Unit | `src/app/routes.test.ts`, `src/lib/router.test.ts` | parsePath/buildPath inverse, `:param` match, day query |

Frontend URL router live (`src/lib/router.ts` + `src/app/routes.ts`): deep-linkable, shareable URLs,
browser back/forward (popstate), route params (`/raw/:id`, `/contexts/:id`, `/clusters/:id`), 404.
Zero-dependency (no react-router). See `ROUTING_SYSTEM.md`.

## 5. Assumptions still unverified

- Docker PostgreSQL container startup (D-026 switched active adapter to PGlite).
- PostgreSQL adapter for managed/deployment use; not implemented.
- Phase 05 scenario evaluation has not yet been executed.

## 6. Next action

Phase 05 — execute scenarios A–D, record observed results, known limitations and Thylas integration requirements. Do not start without user approval.

## Phase 07 — V1 痕迹层（M1）：COMPLETE（2026-11-22）

- 写入点：detail GET 记 `opened`（10 分钟节流）；updateItem 记 `updated`/`status_changed`（detail=changed_keys，含 `fields.<key>`）；POST /api/proposals 记 `proposed`（actor=agent）。
- 聚合：`activityCountsByItem`（一次 inArray GROUP BY，零 N+1）→ GET /api/items 附 `activity` map（listItems 客户端聚合时透传）。
- 前端：ActivityBars 双色条（蓝=你/橙=Agent）挂列表行尾；详情足迹行「你 N 次 · Agent N 次 · 最近 T」（DetailShell footprint 槽）。
- 无需迁移（events.actor/action 已存在）；repo/items.ts 为事件唯一写源（避免双记）。
- 验证：tsc=0 lint=0 vitest 136/136（+server/engagement.test.ts）；DOM 探针 174 条；截图 v1-activity-bars.png / v1-footprint.png。

## Phase 07 — V2 多投影切换（M2）：COMPLETE（2026-11-23）

- ViewMode 五态（list/grid/relations/timeline/spatial 占位）+ ViewSwitcher（raw/objects 页）。
- TimelineView：当前筛选集事件流按日分组，蓝/橙 actor 色点+动作标签+点击跳详情。
- RelationsView：SVG 固定分层布局（非图库），实线=已确认边、虚线=待确认 association 提案，点击开详情。
- 新只读端点：GET /api/events?item_ids=（限 200 ids/1000 条）、GET /api/relations?item_ids=（两端均可见才返回）；均注册 KNOWN_ROUTES（顺手补漏 POST /api/relations 注册漂移）。
- Saved views：命名筛选+视图组合存 localStorage（保存当前筛选/视图库/删除）。
- 验证：tsc=0 lint=0 vitest 138/138（+server/views-projections.test.ts 2 测）；零副本探针 10 次切换 0 写；截图 v2-relations.png / v2-timeline.png。

## Phase 07 — V3 归因与提案面（M3）：COMPLETE（2026-11-23）

- actor 穿线：updateItem(opts: actor/via)，提案接受 → actor=agent + `via proposal <id>`；association → relation created_by=agent；cluster → target 补 agent 事件。
- computeAttribution（src/lib/events.ts 纯函数）：编辑计数 + field_owners（最近编辑者优先）；GET /api/items/:id 附 attribution。
- 详情页：归因条（你 N 处编辑/Agent N 处编辑/N 条提案待确认）+ 字段行尾编辑者圆点 + 内嵌提案行（采纳/拒绝/暂缓=本地收起）。
- 词表纪律：提案状态仅 accepted|rejected（暂缓不入 schema）；正文逐字下划线/意图推断/冲突合并 UI 后置。
- 验证：tsc=0 lint=0 vitest 140/140（+server/attribution.test.ts 2 测）；截图 v3-attribution.png。

## Phase 07 — V4 空间工作台（M4）：COMPLETE（2026-11-23）

- SpatialView：拖放摆位（pointer 事件，位移阈值区分点击）+ 矩形圈选（虚线框=上下文边界）+ 底部条「圈定 N 项 · 改边界 · 提交给 Agent · 钉住摆位 · 清空摆位」。
- 委派真链路：圈选项 → POST /api/agent/propose（ChunkSuggestion）→ 逐条落 POST /api/proposals（semantic_name/classification，source=agent）→ 紫框提案卡落目标卡旁（按目标堆叠），三键复用 V3。
- Q-E 两档：scratch=gsc.spatial.v1（localStorage）；kept=spatial_layouts 表（0012 迁移，逐行坐标，owner+page 主键）+ GET/PUT /api/spatial-layout（PUT idem）。「钉住摆位」scratch→kept 升档。
- 零副本：摆位/圈选/切换仅 localStorage+GET（探针 12 切 0 写）；分类提案接受仅落定不自动改类（如实）。
- 验证：tsc=0 lint=0 vitest 167/167（+server/spatial.test.ts：round-trip/replace/owner 隔离/契约守卫）；截图 v4-spatial.png（圈定 20 项 + 上下文条 + 提案卡）。

## Phase 07 — V5 场景闭环（M5）：COMPLETE；Phase 07 全部完成（2026-11-23）

- 双场景闭环：A（20 材料 file source 入料）/ B（10 URL 采集，2 重试后 10/10）→ 圈定 → LLM 委派 → 提案卡 → 裁决 3采/3拒/1缓 → 归因溯源。
- 归因对账：scripts/verify-attribution.mjs + data/v5-ledger.json → 7/7 PASS（via proposal 紫迹、拒绝零编辑、web 基线全对）。
- 写账本：32 入料 + 80 提案 + 6 裁决，背景写 0（探针实证）。
- 发现（P1 待修）：提案堆积（detector 噪声+管线按 chunk 产命名，单目标 12 条）· 采集无自动重试 · 管线命名粒度。
- 结论与三感觉核对：docs/research/malleable-context-space/PHASE_07_M5_结论.md。
- **Phase 07 COMPLETE**：M1 痕迹（D-089）· M2 多投影（D-090）· M3 归因提案（D-091）· M4 空间（D-095 并行线 + D-097 集成验收）· M5 闭环（D-098）。验证基线：tsc=0 lint=0 vitest 167/167。

## P1 提案面治理：COMPLETE（2026-11-23，D-099）

- 根因修复：detector 去重键错配（metadata:id:null vs metadata:id:）→ 统一 relKey + 同目标同类 pending 上限 3。
- 管线命名聚合：12 条/目标 → ≤2（semantic_name+classification 各一，rationale 汇总，纯函数单测）。
- 采集自动重试：retryable 失败退避重排（updated_at 闸 0/60/120/180s），3 次后终态 failed（retry_count 字段启用）。
- UI 折叠：详情同 kind 折叠组（12 行→3 组）+ 空间每目标一卡「+N」展开。
- 存量清理：dedupe-proposals.mjs 两刀（identical 去重 + 超 cap 收尾），带限流重试；pending 497→255、0 重复、堆叠≤3（verify-proposal-hygiene PASS）。
- 验证：tsc=0 lint=0 vitest 182+1skip/183（+server/hygiene.test.ts 4 测：双跑零增量回归/上限/聚合/重试退避）。

## LOCAL_SIM 云端同构采集模拟：COMPLETE（除 compose 起套门）（2026-11-23，D-101）

- 同构拓扑：docker-compose.yml（db=PostgreSQL16/api/worker 四卷，= 云部署文件）+ Dockerfile + GSC_WORKERS 拆分；PGlite 退居单测。
- schedules 注册表（0013 迁移，逐列）+ worker 进程调度器（到期判定/running 闩锁/僵死回收）。
- 文件夹扫描适配器（只读、hash 增量、快照幂等、单轮上限 200）+ 爬虫适配器（SSRF、2s 间隔、data/crawl 留档 HTML+meta）。
- 独立 dashboard（D-102）：dashboard/（8790 静态+/api 代理），不进 GSC 页面；启动器 start-gsc-dashboard.bat 在桌面 bats 文件夹。
- 实测（裸模式）：文件夹 run-now scanned1/imported1；网页 run-now fetched2/imported2 + 留档 4 文件；控制台截图 local-console.png。
- ⏳ 待办：docker compose up 起套 + down/up 卷持久演练（需用户启动 Docker Desktop）。
- 验证：tsc=0 lint=0 vitest 191+1skip/192（+server/schedules.test.ts 3 测）。

## G2 三端采集闭环：COMPLETE（opencode/codex 真跑一轮待补）（2026-11-23，D-103）

- `/api/ingest/batch`：分组（client×project×session）→ agent source 锚点 + 快照幂等 + Light Up 管道 + 归块 cluster 提案（best-effort）。
- `integrations/gsc-push.mjs` 共享 CLI（--codex-event notify 入口 + rollout 收割）；opencode 插件（session.idle）；codex notify 配置件；WorkBuddy skill（用户级 `~/.workbuddy/skills/gsc-push/`，能力表+核对清单）。
- cluster accept 归并语义：同名 cluster 加入成员而非新建（D-042 延伸）。
- 实测（WorkBuddy 真链）：push imported=1 / 重推 skipped=1（幂等）/ 命名+分类提案落卡 / 归块 block_proposals=1。
- 实测修 2 bug：LLM 包壳数组契约容忍 · 归块幻觉 id 守卫（详见 KNOWN_ISSUES）。
- G3 兼容矩阵补全（component-list.md）：三端采集 ✅、codex 上下文注入 ❌、MCP 读 🔜。
- 验收补充（D-104）：codex 链全通（notify 链式派发器保 Desktop 原钩子 + 真实 rollout 收割入库）；opencode 插件双加载器适配（V1 server()/V2 id+setup，加载验证干净）；WorkBuddy 全通。真轮末触发待用户日常使用验证（无头 exec/run 在本机环境挂死，见 KNOWN_ISSUES）。

## META_TAG_SYSTEM_V1：COMPLETE（2026-11-24，D-105）

- 0014：meta_groups（四组预置+visibility_default 云域提示）· meta_tag_groups 多父边 ·
  assignment_params/item_meta_params 两层 typed 参数 · 幂等打标索引 · proposals.related_definition_id。
- 闭环：定义（设置页 tag 表单多选组）→ 建议（suggestMetaTags 从现有定义选+幻觉 id 守卫）→
  确认（accept=confirmed=1，D-066）→ 打标（带参）→ 筛选（?group=&tag=&param.k=v 交集 + UI 组 chips）。
- 实测：vitest 4/4 + 全量 198+1skip/199；手动腿全链（多父/带参/交集筛选）；meta-filter-chips.png。
- 待后置：tag→tag 层级 · confidence 生效 · 组管理 UI · 云同步（visibility_default 只是预留）。
