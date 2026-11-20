# IMPLEMENTATION_STATUS.md — What Actually Works

Updated: 2026-11-19 (Phase 05 UI shell implemented, verification passed).

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

## 5. Assumptions still unverified

- Docker PostgreSQL container startup (D-026 switched active adapter to PGlite).
- PostgreSQL adapter for managed/deployment use; not implemented.
- Phase 05 scenario evaluation has not yet been executed.

## 6. Next action

Phase 05 — execute scenarios A–D, record observed results, known limitations and Thylas integration requirements. Do not start without user approval.
