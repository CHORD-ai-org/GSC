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
- G5 收尾（D-106，2026-11-24）：pending_definition 提案流——发明新 tag 一律走
  `new:<name>` 引用 + pending_definition 提案；accept 建定义并升级引用，meta_tag 才落打标；
  定义未确认前 accept meta_tag = 保持 pending + blocked 溯源（实测揪出消费缺陷已修）。

## G2 三端集成管理面：COMPLETE（2026-11-24，D-108）

- 设置→连接「三端采集」区：4 卡下载（插件/派发器/CLI/skill 镜像）+ 复制安装命令 + 连接灯
  （agent:<client>:* 锚点+最近活动）+ 「测试链接」（真 ingest 路径自推）；Token 生成/吊销用
  既有 TokenSection；`/settings?section=connections` 深链。
- API：/api/integrations/{files/:name,status,test}；ingest 核心抽 `server/intel/batch.ts` 共享。
- 实测：integrations.test 1/1 + ingest 3/3 + 三端点 live + integrations-panel.png。

## SIDEBAR_PLAN：COMPLETE（2026-11-25，D-109）

- 侧栏新增「置顶」（spatial pinned 数据面+折叠存 UiPrefs）与「最近」（对话列表，GET
  /api/conversations，行→/chat/:id 占位视图）；两个「最近」语义分立（信息时间 vs 对话时间）。
- G7 数据骨架前置：0015 conversations/messages + repo/chat.ts + 3 路由。
- 实测：conversations.test 1/1 + sidebar-two-recents.png。黄点/真 ChatView/置顶动作随 G7。

## G7 Step 0/1：边界落账 + 数据层 0016（2026-11-25）

- Step 0：DESIGN_BOUNDARIES conversations 行拆分（GSC=信息工作对话与任务编排）· D-110 边界
  演进落账 · GOALS G7 → 执行中。
- Step 1：0016_chat_workspace.sql——message_blocks（kind CHECK 五类）/tasks（乐观锁 version）/
  task_stages（kind+status CHECK 枚举，状态机表）/uiflows（status CHECK）；ord 稀疏惯例
  （1024 间隔）；(message_id,ord)/(task_id,ord) 唯一。schema 注册全。
- 验收：chat_workspace.test 2/2（CHECK 拒非法枚举 ×4 / 稀疏 ord 插入+唯一拒绝 / version 默认 1）。

## G7 Step 2：仓储（PATCH 算子 + 状态机转移表）COMPLETE（2026-11-25）

- `repo/chat.ts` 扩展：messages/blocks CRUD（稀疏 ord 1024+竞态重试）· createTask/getTaskWithStages
  · **transitionStage**（转移表白名单 pending/running/awaiting_user/done/failed，非法
  InvalidTransitionError；每次迁移留 task_events 对账）· **patchTask**（op_hash=sha1(canonical op)
  幂等；纯增即时/删移改 kind 落 task_patches 提案；乐观锁 version 批进一次）· resolvePatchOp
  （accept=应用，reject=留痕）。
- 0016 补 task_patches（任务域提案载体——proposals.target_id 是 items 外键指向不了 task，
  D-042 不变式按域分载体）+ task_events（任务域审计线）。
- 实测修 3 真问题：version 双倍递增（改批进一次）· 并发 ord 竞态（唯一键+重试）·
  drizzle 违例检测（pg code/detail 在 cause 链，递归检测）。
- 验收：chat_workspace 5/5（转移全 pair+非法拒+events 对账 / op_hash 重放零重复+分流+
  裁决 / 并发 ord 全落）。

## G7 Step 3：薄编排器 COMPLETE（2026-11-25，D-111）

- `agent/structured.ts`：structuredCall（extractJson→validate→修复重试 1 次→PlanError）。
- `agent/uispec.ts`：generateOnboardingFlow（LLM 产 DSL 文本+模板兜底）。
- `agent/orchestrator.ts`：startTask（指令→计划生成→任务卡→runStages）· runStages（每轮
  重载新鲜状态、四执行语义编排既有引擎、重试≤3 退避、confirm 停 awaiting_user+uiflow 落）·
  resumeTask（user_input→恢复续跑）· StageExecutor 插座（tool-loop 预留）。
- 执行语义：collect=分词多查+零命中兜底取最新 · synthesize=suggestForChunks/meta 提案
  （读 collect.detail refs）· compose=LLM 草稿+模板兜底 · confirm=DSL+停点。
- 实测发现（记 D-111）：chatComplete 内建重试吸收瞬时错（stage 下自愈）；compose 模板兜底
  不红标——stage 级重试/红标以「解析违约」路径实测。
- 验收：orchestrator.test 4/4（成功链含停点/uiflow/提案 · 回退默认管线+note 明示 ·
  重试留痕+三连违约红标 · resume 恢复续跑至任务完成）。

## G7 Step 4：API 层 COMPLETE（2026-11-25）

- 路由：POST/GET /api/conversations/:id/messages（发指令→startTask 同步执行→201 返执行后
  真实态；消息+块 cursor 分页）· GET/PATCH /api/tasks/:id（投影源 task+stages+uiflows+patches；
  卡内 PATCH 带乐观锁）· POST /api/tasks/:id/advance（awaiting_user→resume / 否则手动推进）。
- 错误语义：409 VersionConflict · 422 非法迁移/完成段不可推进 · 404 目标缺失 · 400 契约。
- generatePlan catch-all（任何失败回退默认管线，note 明示不阻塞）；startTask 响应返回执行后
  真实阶段态（非 createTask 快照）。
- 验收：chat_api 2/2（201 骨架+默认管线回退+块/投影源 · 400/404/409/422/算子契约）+ curl 真验
  全链（awaiting_user 停点+uiflow 落+PATCH applied+409+422）。

## G7 Step 5：ChatView 骨架 COMPLETE（2026-11-25，V1 收口）

- `src/views/chat/`：ChatView（消息流+块渲染+底部输入）· TaskCard（「新建任务」+管线小卡
  序号/状态色/awaiting_user 黄标+展开 steps+卡内「还有想添加的？」→ PATCH add_stage 乐观
  ghost）· chat.module.css。块渲染五类：text/note/operation(=TaskCard)/reference/flow。
- App 'chat' 路由换真视图；api.ts +sendChatMessage/getTaskProjection/patchTaskOps/advanceTask。
- 实测截图 gsc-chat-v1.png：对照 §0.5 V1 行全中（任务卡灰卡/五段管线状态色/黄标/卡内输入/
  灰播报/交互面 chip/底部输入；05 导出PDF=PATCH 实证在列）。
- 记录：Composer 全量接入后置（V1 轻量输入对齐原型）；V1 轮询（任务卡 2s/消息按需）。

## G7 Step 6：DSL 解析器 COMPLETE（2026-11-25）

- `src/lib/uiflow.ts`：parseFlow（行式 tokenizer→AST→四道校验：词表白名单/字段类型/
  reference 形态+checkReferences 存在性/confirm 提案动作白名单）+ 降级链（单行降级 note
  原文保留→整流降级全 note 不丢输入）+ renderFlow（逆向，round-trip/uispec 模板共用）。
- 安全限制：节点≤30/字段≤40/值≤2000/标题≤80/`!dsl v1` 版本标（未知版本整流降级）。
- uispec 模板修正：`confirm write: pending` → `metadata(plan)`（pending 非法动作）。
- 验收：uiflow.test 6/6（文法全过 · 非法词/动作降级保文 · 引用校验 · 整流降级 · 限制 ·
  round-trip fuzz 50 例恒等）。

## G7 Step 7：FlowPanel Drawer + confirm→提案 COMPLETE（2026-11-25，V2 收口）

- `FlowPanel.tsx`：右侧 Drawer ≈64% 宽（portal 不卸载消息流）· review 可改预填/collect 表单/
  choose 单选/写入清单/确认写入；降级内容如实展示；`?flow=` 深链。
- `completeFlow`（orchestrator）：confirm 动作→提案映射——meta_tag（按名解析定义；未命中走
  pending_definition+new: 引用，D-106 复用）· cluster/semantic_name/classification/metadata
  直落 kind · association/dedupe/pending_definition 仅记录；表单结果回流 stage.detail；
  uiflow→done→resumeTask 续跑。
- 路由 GET/POST /api/uiflows/:id(.complete)（404 前置检查）。
- 验收：flow_complete 2/2（三动作映射含未命中双提案 · 回流/续跑/幂等 · 路由契约/404）+ 截图
  gsc-chat-v2-drawer.png（§0.5 V2 行全中）+ curl 真链（confirm 停点→done、续跑至 task done、
  uiflow done；proposals=0 因旧模板 confirm 行降级——映射路径 vitest 已证）。

## G7 Step 8：V2 收口（2026-11-25，D-112）

- §0 场景端到端实证（8793 真链）：发指令→任务卡管线→卡内 PATCH「导出PDF」→synthesize
  红标（LLM 401）但管线穿到 Onboarding→Drawer review 改值/collect 输入→confirm→**1 条
  metadata 提案落地**（rationale 带表单值）→PATCH 段续跑 done→uiflow done→task failed
  （红标可见）。
- D-112 运行器语义：增强段失败不阻塞（仅 awaiting_user 停点返回）；相关套件 8/8 零破坏。
- 环境发现：.env.local 的 GSC_LLM_API_KEY 当前 401 失效（fallback:True/synthesize 失败根因）。
- 验收图 gsc-chat-e2e-final.png（任务卡红标+失败原因+引用 chip+播报流）。

## G7 Step 9：双时间线余项 COMPLETE（2026-11-25）

- 对话行 **awaiting_user 黄点**：listConversationsWithStatus 聚合（task_stages join）→ 侧栏
  琥珀点（实测：停点会话 True/余 False；截图 sidebar-awaiting-dot.png）。
- **reference 块可点开**：chip → openItemInPage 导航条目详情。
- **播报四类完备**：启动（正在启动任务管线）/推进（正在执行：X）/停点（启动 Onboarding 的
  交互流）/恢复（用户输入已收到（恢复执行））+ 终态播报。
- 验收：chat_workspace 7/7（黄点正确 · 四类回放+task_events 对账≥每段一次迁移）。

## G7 Step 10：V3 收口 / G7 总账（2026-11-25，D-113）

- G7「GSC 对话」V1+V2+V3 十步全落：数据层（0015/0016 八表）· 仓储（PATCH 幂等/转移表白
  名单）· 薄编排器（D-111/D-112）· 8 路由 · ChatView/TaskCard/FlowPanel · DSL 解析器 ·
  双时间线。E2E §0 场景真链 + 四图验收；全量 237+1skip/238。
- 遗留（已记 D-113）：LLM key 401 · Composer 全量/WS · PATCH kind 启发式 · tool-loop 插座。

## G7 正式验收：PASS（2026-11-25）

| 门 | 证据 | 结论 |
|---|---|---|
| 状态机 | 转移表白名单（chat_workspace 全 pair）· 422 实测 · 重试≤3 红标（orchestrator 测） | ✅ |
| LLM 任务层 | 回退默认管线+note 明示（orchestrator 测+真链 fallback:True）· 修复重试 1 次 | ✅ |
| PATCH | op_hash 重放零重复（applied:1→replayed:1）· 纯增即时/删移改提案 · 409 实测 | ✅ |
| DSL | 白名单/引用校验/降级不丢输入/round-trip fuzz 50（uiflow 6/6） | ✅ |
| 确认 | complete→1 提案→**accept 落定 accepted**（prp_479611ab，D-042 对账） | ✅ |
| 投影 | 消息块回放完整（四类播报）· task_events≥每段一迁移对账 | ✅ |
| 回归 | tsc=0 lint=0 **vitest 237+1skip/238**（51 文件） | ✅ |

真链冒烟（8793 fresh）：发指令→管线→PATCH→重放幂等→Drawer complete→提案→accept→409/422→
终态（synthesize 红标可见/续跑至 done/task failed 如实）。四图验收（v1/v2-drawer/e2e-final/
awaiting-dot）。**验收结论：PASS**（遗留项见 D-113，均非阻塞）。

## UI_PARITY_FIX_PLAN R1–R5：UI 保真修复 COMPLETE（2026-11-25）

- R1 浅蓝大泡+顶栏 · R2 任务卡竖排四步+Onboarding 绿边英文三步+语义标题+卡内右栏 ·
  R3 播报精简（内部日志只留审计线）+ 灰说明块原型原文 · R4 生成器带候选（无 key 也丝滑）+
  FlowPanel stepper 点选即流转 · R5 composer 胶囊+附件/模型条只读形态。
- 截图 parity-r1-r3.png / parity-r4-stepper.png，P0 1–9 全打勾（UI_PARITY_AUDIT 修复结论）。
- 测试口径更新：播报四类（启动=正在启动信息收集管线/停点/恢复/终态），内部执行日志不出消息块。

## 生成页面居中 + 底层框架调研（2026-11-25）

- FlowPanel 从右侧 Drawer 改**居中模态**（min(760px,92vw)、圆角 16、阴影）——创始人要求
  「生成的页面在中央」；截图 flow-centered.png。
- 调研结论（UI_FOUNDATION_RESEARCH.md）：**不换框架**（Tailwind/shadcn 成本高、审美冲突）；
  走路线 B——令牌收口 + 原生 `<dialog>` + CSS transition（零依赖）；Radix 仅在出现多模态
  堆叠/焦点事故时引入。

## META_TAG_PIPELINE M1–M3：识别管线 COMPLETE（2026-11-26，D-115）

- detect 轮 3→5 维：+meta_tag 建议（suggestMetaTags×未打标条目×定义表）+tag discovery
  （规则候选→LLM 规范名→pending_definition，同名幂等）；report 扩 meta_tag/discovered/
  candidates/llm（ok|skipped|absent）。
- ingest/batch 收尾钩子 maybeDetectOnIngest（仅新增、GSC_DETECT_ON_INGEST=0 关、非阻塞）。
- dashboard（8790）：「识别管线」面板——一键全量识别+报告展示+待裁决提案按维计数；
  server.mjs API_PORT env 化。
- 实测：detect 真链 llm=skipped 如实（401）；10/10 新测（含降级/幂等/开关/同名不重复）。
- 遗留：LLM 维真值验证待换 key；M4 四轴接线待 G6 B 批。

## 全站 UI 体检第 2 轮 + P0 修复（2026-11-26，SITE_UI_AUDIT）

- 11 视图逐页截图审计；P0 两项已修：① 页头筛选 chips 贴顶截断（限定 raw/objects+页边距）
  ② overview 提案卡 JSON 泄漏（humanizeProposalValue 可读化，同步 detail/lightup/spatial）。
- P1 七项入档（sync 色块/recently 空态矛盾/lightup 线索/页距/原生 select 等），
  修法前置=令牌收口（路线 B）。截图 audit-*.png / fix-*.png。

## FORAGENTS F1：Agent 自举教程 COMPLETE（2026-11-26）

- 内容源 `docs/agents/foragents.md`（真 .md 文件，单一源）+ `server/agents-tutorial.ts`
  （readFileSync 导出）+ `GET /api/foragents.md`（text/markdown 直写，无 idem——
  幂等包装要求有返回值，void 直写会被转 JSON 的坑）+ 隐藏视图 `/foragents`
  （ForAgentsView：极简 MD 渲染+代码块复制按钮；ViewId 加 foragents、不进 GROUPS）。
- 七节内容事实核对：env 实名 GSC_API_TOKEN（差点写成 GSC_TOKEN，测试锚死）· MCP 9 工具
  断言防漂移 · markdown 源改文件存储（模板字面量 \` 在 esbuild/node 行为差异的坑）。
- 验收：curl GET text/markdown 200+七节+9 工具名 · foragents-page.png（导航无入口）·
  foragents.test 4/4 · 全量 245+1skip/246。

## USER_PROFILE_INIT U1：初始画像构建管线 COMPLETE（2026-11-26，USER_PROFILE_INIT_PLAN）

- 文献检索（ai-know-you Calibration/画像三字段/Progressive Profiling/Birth System 90s）→
  设计=四屏映射既有资产（源连接→合成→校准→引导），不新增 item type。
- 落地：0017 迁移（users.companion_name）· agent/profile-init.ts（ensureProfileAnchor
  source_label=user_profile 幂等锚点 + buildInitialProfile：伴灵名 Tau+用户画像/个人经历两组
  限定打标提案+401 降级）· POST /api/profile/init（201+报告）。
- 实测：3/3（锚点幂等/伴灵名持久化/组限定提案挂 chunk/降级）+ 全量 248+1skip/249。
- 待办：U2 屏 1/2 UI · U3 屏 3 引导 · U4 语音（Fish Audio）+X OAuth。

## USER_PROFILE_INIT U2/U3：三屏 UI 还原 COMPLETE（2026-11-26）

- 独立壳层 `/onboarding`（无侧栏/无命令面板，原型白底全屏）：屏 1 源连接（四 logo 卡+绿勾+
  composer 三件套）· 屏 2 依次 notes（正在构建→已完成→容我介绍）+Tau 吉祥物+命名+「继续画像
  的初始化:3」· 屏 3 大字+黄色小鸭+scroll 提示+「进入 GSC」。`?step=` 深链（屏 2 自动续跑合成）。
- 屏 2 驱动=POST /api/profile/init（真实管线）；伴灵名 GET/POST /api/profile/companion
  （持久化 users.companion_name，守门测试抓漏后补 idem）。
- 验收：三屏截图对照原型全中（g8-step1/2/3.png）· 全量 248+1skip/249。
- **100% 还原修正**：手绘 SVG 全部替换为真品牌资产（CHORD Character Universe，MIT）——
  Tau.jpg/Gamma.jpg/gsc logo.png → public/brand/；三屏重截对照原型一致（g8-step1/2/3.png）。
- 待办：U4 语音（Fish Audio）+X OAuth 真接入；源 logo 品牌图标替换占位字卡。

## USER_PROFILE_INIT U4：语音+OAuth+品牌图标 COMPLETE（2026-11-27）

- **Fish Audio TTS 真接入**（官方 API 核对：POST api.fish.audio/v1/tts，Bearer，s2.1-pro-free
  免费档）：integrations/fishaudio.ts + GET /api/tts/status + POST /api/tts（mp3 二进制）；
  屏 3「🔊 让 Tau 开口」按钮（blob→Audio play）；未配置如实上报（502+提示）。
- **X OAuth 2.0 PKCE 管线**：integrations/xoauth.ts（authorizeUrl/exchangeCode）+
  /api/auth/x/status|start|callback（verifier 进程级暂存，302 跳转）+ 0018 oauth_tokens 表；
  env=GSC_X_CLIENT_ID/SECRET；未配置=屏 1 占位+如实状态。
- **品牌图标**：X 卡换真实官标 SVG（修复字重复 bug）；其余源卡字卡占位。
- 验收：u4_integrations 3/3（官方端点断言/未配置如实/status）+ 真链（tts/status·auth/x/status
  未配置如实）+ 三屏截图（X 官标/语音钮）· 全量 252+1skip/253。
- 配置即活：设 GSC_FISH_AUDIO_KEY / GSC_X_CLIENT_ID+SECRET 后无需改码。
- **首页双视角（2026-11-27，创始人指令）**：Start 页顶部 Start/Overview pill 切换两个视角
  （Overview 视角内联渲染 OverviewPage）；侧栏高亮名跟随视角（overview 视角→高亮「总览」）；
  go('start') 重置回 Start；?home=overview 深链。侧栏导航/总览页本身不变。
- **系统接线（2026-11-27）**：/api/profile/status + 首启自动进入 onboarding（未初始化→跳三屏，
  gsc.onboarded 标记防重复）+ Start 页「初始化画像」快捷入口（补做/重跑）。
  真验：status {initialized:true, companion:Tau, user_name} · g8-start-entry.png（按钮就位）。

## OVERVIEW_REDESIGN OV-BE + OV1 COMPLETE（2026-11-27）

- **OV-BE**：repo/overview.ts 两个只读聚合（overviewStats 7 日 events 桶+今日 items/proposals；
  overviewFeed events+proposals 合流倒序+标题 join）+ GET /api/overview/stats|feed + 2/2 对账测试
  + 真链（stats 天桶实数/feed 出「我的秘密基地」等真实叙事行）。
- **OV1**：OverviewPage 欢迎区（欢迎回来,{user_name}+副语）+源行（X 官标+书签/灵感/知识库
  线稿图标+X 连接绿勾=oauth_tokens 真状态）+「进入用户画像 →」（落点=提案队列）+seg 挪欢迎行
  右侧（顶栏 seg 仅 Start 视角显示）；旧区块自然下沉保留。
- 视觉超越草稿（计划 §2 标准）：ov1-welcome.png 实证。
- 待办：OV2 数据卡 / OV3 叙事活动流 / OV4 无边界横滑区 / OV5 长页整合。

## OVERVIEW_REDESIGN OV2：今日数据传输量卡 COMPLETE（2026-11-27）

- OverviewPage 源行右侧数据卡：「今日数据传输量/流量图」手绘 SVG 7 日柱状（今日柱强调色，
  hover 出日期+条数 title）+ 副指标（今日新增 chunks/提案）——数据=GET /api/overview/stats
  真实计数（零依赖，零造假）。ov2-datacard.png 实证。

## OVERVIEW_REDESIGN OV3：叙事活动流 COMPLETE（2026-11-27）

- src/lib/narrate.ts 纯函数叙事模板（事件按 actor 你/Agent+动词映射；提案映射 Agent 叙事句；
  空标题兜底「已删除条目」）+ 3/3 单测。OverviewPage「历史记录」区块：灰底容器白胶囊行+
  来源图标（用户/星形/GSC 块）+相对时间；**最新一条黑底白字**（笔记原意）；空态引导不造假。
- 数据=GET /api/overview/feed?limit=5（oldest→newest 渲染）。ov3-feed.png 实证。

## OVERVIEW_REDESIGN OV4：无边界 cluster 横滑区 COMPLETE（2026-11-27）

- 「下面想编辑什么？」渐变无边界 subsection（**仅此区无边界**，C 纠偏口径）：
  浅暖灰渐变圆角容器+无边框白半透明 tiles（title+条目数）；**三路交互**——按住拖动横滑
  （grab/grabbing+moved 防误触）+scroll-snap+←→键盘（focus-visible 焦点环）+reduced-motion 降级。
- 数据=clusters prop 真列表（≤12）；空态引导如实。ov4-band.png（3 真 cluster）实证。

## OVERVIEW_REDESIGN OV5：长页节奏对照笔记 COMPLETE（2026-11-27）

- 旧区块节奏：待裁决+最近双栏并排（笔记底部两块）· 全页 .section 44px 垂直节奏 ·
  statGrid 2 列配平 · 统计卡灰白化（.page scope，尊重全局色块轮换，见 D-117）。
- ov5-long.png（1440x2400 全页）：欢迎→源行+数据卡→历史记录→横滑区→统计→双栏→
  关联组/组织活动/标签云，节奏均匀。OVERVIEW_REDESIGN 五批全落（D-117）。
- 尾巴：整页视觉微调随真实数据增长再调；叙事文案待创始人美化（笔记自注，KNOWN_ISSUES 级）。

## OVERVIEW_REDESIGN 文案美化 v1（2026-11-27，待创始人过目）

- narrate.ts 词彩升级（事实不变只换叙事词）：事件=「写下了/添了新笔墨/请进档案柜/换了个新名字」；
  提案=「挑好称心标签/想好了名字/该有个归处/细查来龙去脉/心意相通/嗅到新标签/警觉发现重复」。
- 3/3 测试同步；ov-copy-v1.png 实效（「你写下了「我的秘密基地」」末条黑底）。
- Status：v1 待创始人过目 → 定稿或改写。

## 模型配置/选择 UX M1-M3 COMPLETE（2026-11-27）

- **M1 测试连接+状态灯**：checkLlm()（真探针 ping）+ Composer 状态灯（ok 绿/fail 红/idle 灰），
  健康事件全局广播（gsc-llm-health）——api 层拦截 LLM 相关失败（/llm|401|api key/i）自动红。
- **M2 模型选择器升级**：菜单=搜索框+「最近 3」置顶（localStorage）+按 provider 分组全量列出+
  当前项 ✓ 常显+跨 provider 一步切换（provider+base+model 同 patch）。
- **M3 失败态可视化**：LLM 失败自动红灯；菜单 footer 测试连接旁灯常显。
- **顺手根治**：顶栏 seg/iconBtn/topSpacer 类名错配（styles 在 app.module 但类定义在 views.module）
  导致裸按钮堆叠——app.module.css 补齐（一行排布+灰胶囊白选中分段控件）。
- m13-composer.png 实证（分段控件+状态灯）。全量 257+1skip/258。

## Start 页动态提示行（2026-11-28，创始人定调）

- 主 GSC logo 下加「下一步我们 ____？」：固定句 Inter Bold（19px/700）；短语槽随时间轮换
  （4.2s fade 切换）且**各配字体**——添加些什么(Inter)/审查一个新项目(Georgia serif)/
  随便逛逛(mono)/聊聊最近的事(cursive)；短语集可随产品生长扩展（注记原意）。
- prefers-reduced-motion 降级（无 fade 直切）。next-prompt.png 实证。

## Sidebar 对话 thinking orbs（2026-11-28）

- ChatView 发送期间广播 gsc-chat-thinking 事件 → App conversations 记 thinking 态
  （refetch 保活不被冲掉）→ 侧栏对话行显示 ThinkingOrbs（三枚渐变光球错相脉动：
  紫/青/粉 radial-gradient，1.15s ease-in-out，错相 180ms）。
- 优先级：thinking orbs > 等你确认橙点；reduced-motion 降级静态。
- thinking-orbs.png 静态验（orbs 为生成瞬态）；全量 257+1skip/258。

## CLUSTERS_UI_PLAN CL1-CL3 COMPLETE（2026-11-28）

- **CL1 书架墙+Gallery 网格**：书脊卡（id-hash 色脊+成员/创建时间 meta+7 日密度条+待裁决红点）
  与 Gallery 封面卡（低饱和语义底色+56px 自绘符号**按成员数自动分派**[书架线/双叠方块/点阵]+
  状态点+底缘密度条）双视角；排序 pills（最近活跃/成员数/名称，默认最近活跃）；
  密度=成员 events 一次批取聚合（真数据）。**?view=list|grid 深链**（useViewMode 增强）。
- **CL2 详情重构**：语义名提案横幅（就地 ✓ 用这个/✕ 不用）· 成员卡片网格（✕ 角标移除）·
  添加成员=**搜索选择器**（点选添加，替代下拉）· **归块履历时间线**（narrate 同源叙事，
  倒序 ≤12+日期）· 定义/分享块与编辑/删除/共享功能全保留。
- 验收：cl1-wall.png/cl1-gallery.png/cl2-detail.png · 全量 257+1skip/258。
