# DECISION_LOG.md — Design and Technical Decisions

Statuses: `DECIDED` · `PROPOSED` · `OPEN` · `DEFERRED`. Never upgrade without authorization.

## D-001 — Independent repository

- **Decision:** GSC is built in its own repository, not inside Thylas.
- **Reasoning:** must be independently implementable, useful, and evolvable.
- **Alternatives:** Thylas submodule; Thylas route only; shared monorepo package.
- **Consequences:** no runtime import of Thylas code; duplicated visual rules allowed, shared code not.
- **Status:** `DECIDED` — 2026-11-16, task brief.
- **Source:** `PROJECT_CONTEXT.md` §2.

## D-002 — GSC is one section of Thylas Overview

- **Decision:** if integrated later, GSC occupies one section within Overview, not the whole page.
- **Reasoning:** Overview has its own header, intent input, Continue, Needs you, Workspaces, Recently.
- **Alternatives:** replace Overview; new top-level Thylas page only.
- **Consequences:** GSC UI must not own unrelated Overview functionality.
- **Status:** `DECIDED` — 2026-11-16, task brief.
- **Source:** `THYLAS_REFERENCE.md` §4.

## D-003 — No full Thylas integration in MVP

- **Decision:** Phase 00–05 produce an independent prototype and integration requirements only.
- **Reasoning:** consumer maturity must not block GSC; integration needs an explicit interface first.
- **Alternatives:** build the Overview section now.
- **Consequences:** no Thylas code changes in these phases.
- **Status:** `DECIDED` — 2026-11-16, task brief.

## D-004 — Local persistence provisioning

- **Decision:** PostgreSQL-compatible schema; local provisioning method unresolved.
- **Reasoning:** brief prefers PostgreSQL; no local PG reachable on 5432/55432, no `psql`; Docker 29.1.5 available.
- **Alternatives:** (a) Docker PostgreSQL container, (b) embedded PGlite as in Thylas migration tests, (c) external managed DB.
- **Consequences:** must not switch to a different query dialect without a logged decision.
- **Status:** `DECIDED` — 2026-11-16, user approval.
- **Resolution:** (a) Docker PostgreSQL. No container started in Phase 01; provisioning is Phase 03 work. (b) PGlite remains a fallback if Docker fails, but switching requires a new decision.

## D-005 — Prototype stack

- **Decision:** Vite + React + TypeScript + CSS Modules + own tokens; `node:http` thin API; Drizzle ORM with PostgreSQL dialect; Vitest.
- **Reasoning:** matches verified Thylas conventions; no new framework or UI dependency; small enough for a vertical slice.
- **Alternatives:** Next.js (rejected in Thylas), Tailwind + UI kit, FastAPI/other backend, no frontend framework.
- **Consequences:** two processes or Vite middleware for API; shared contract modules required.
- **Status:** `DECIDED` — 2026-11-16, user approval.
- **Source:** `THYLAS_REFERENCE.md` §10.

## D-006 — Hybrid Information Model

- **Decision:** Raw Information and Structured Objects are complementary; no forced extraction pipeline.
- **Reasoning:** charter §3.2/§3.3; not every source becomes an object, not every object needs a source.
- **Alternatives:** single unified entity; mandatory extraction on import.
- **Consequences:** two storage families with explicit relationships; more types, less coercion.
- **Status:** `DECIDED` — 2026-11-16, Phase 01 finalization under user approval. Five types confirmed; details in `STRUCTURED_OBJECT_TAXONOMY.md`.

## D-007 — Three levels are conceptual, not infrastructure

- **Decision:** Information / Contextual Objects / Context are distinctions of meaning, not three DB layers.
- **Reasoning:** avoid unnecessary infrastructure.
- **Alternatives:** separate databases or schemas per level.
- **Consequences:** Context Views implemented as assembled subsets in Phase 04.
- **Status:** `DECIDED` — 2026-11-16, Phase 01 finalization. See `INFORMATION_MODEL.md` §3.

## D-008 — Focused initial domains

- **Decision:** prioritize Knowledge Context and a small object set.
- **Reasoning:** four evaluation scenarios need concepts, hypotheses, methodologies, decisions, evidence.
- **Alternatives:** implement all six candidate domains in MVP.
- **Consequences:** User / Coworker / Artifact contexts stay out of MVP.
- **Status:** `DECIDED` — 2026-11-16, Phase 01 finalization. Knowledge Context primary; Work Context limited to Decision objects.

## D-009 — No specialized databases in MVP

- **Decision:** no vector DB, graph DB, queues, or distributed infrastructure.
- **Reasoning:** out of scope; no demonstrated need; charter §7 rejects universal vector database identity.
- **Alternatives:** pgvector for semantic search, Neo4j for relations.
- **Consequences:** relationships are explicit rows/columns; discovery is browse/filter only.
- **Status:** `DECIDED` — 2026-11-16, task brief.

## D-010 — Prototype UI placement

- **Decision:** unresolved — standalone prototype app vs standalone app using a Thylas-shaped Overview-section layout.
- **Reasoning:** independent runtime is required; visual resemblance is optional but useful for later integration.
- **Alternatives:** (a) standalone app with its own navigation, (b) standalone app that renders one Overview-like section, (c) modify Thylas directly.
- **Consequences:** affects Phase 02 UI spec and Phase 04 context view UI.
- **Status:** `DECIDED` — 2026-11-16, user approval. Option (b): standalone app rendering an Overview-style section. (c) remains out of scope by D-003.

## D-011 — Deferred object types

- **Decision:** Principle, Experience, Taxonomy are not in the MVP object set.
- **Reasoning:** no evaluation scenario requires them; keep the hybrid model demonstrable with five types.
- **Alternatives:** include all seven named in the brief.
- **Consequences:** may be added in a later phase without model rework.
- **Status:** `DEFERRED` — 2026-11-16.

## D-012 — Phase order

- **Decision:** execute Phase 00 → 05 sequentially; report and wait after Phase 00.
- **Reasoning:** explicit user instruction.
- **Alternatives:** start Phase 03 implementation immediately.
- **Consequences:** no code until Phase 00 review; any change needs a logged decision.
- **Status:** `DECIDED` — 2026-11-16.

## D-013 — Raw file storage location

- **Decision:** text content in DB `content_text`; original files on local disk at `data/files/<id>` with a relative `storage_ref`.
- **Reasoning:** preserves identity and provenance in explicit fields; avoids blobs and a giant JSONB. Sufficient for an independently runnable prototype.
- **Alternatives:** store files as DB blobs; object storage; embed all content in one JSON field.
- **Consequences:** local disk path becomes part of the Phase 03 persistence adapter; revisit only if deployment requires a different adapter.
- **Status:** `DECIDED` — 2026-11-16, Phase 01.

## D-014 — Raw Information is immutable

- **Decision:** raw item content cannot be edited after creation. Title, `source_label`, and `status` may be edited. Corrections become a new item linked with `related_to`.
- **Reasoning:** editing an "original" destroys provenance.
- **Alternatives:** in-place edits with a version diff; delete and recreate without a link.
- **Consequences:** provenance remains interpretable; users need a correction workflow in Phase 02.
- **Status:** `DECIDED` — 2026-11-16, Phase 01.

## D-015 — Status is lifecycle, not verification

- **Decision:** raw items use `active` / `archived`; objects use `draft` / `active` / `superseded`. No `verified` state. Agent-created objects start `draft`.
- **Reasoning:** brief forbids treating generated statements as verified knowledge; a Hypothesis needs stance relations, not a truth flag.
- **Alternatives:** add `verified` / `rejected` states; let agent origin imply trust.
- **Consequences:** `supports` / `challenges` relations carry critique without changing status.
- **Status:** `DECIDED` — 2026-11-16, Phase 01.

## D-016 — Context View membership is explicit

- **Decision:** a Context View stores an explicit `item_ids` list plus `subject`, `scope`, `purpose`. Membership is never inferred.
- **Reasoning:** conceptual levels must not create infrastructure; Phase 04 needs only an assembled subset.
- **Alternatives:** tag-based membership, embedding similarity, relation traversal.
- **Consequences:** no retrieval engine in MVP; integration consumers can rely on an explicit list.
- **Status:** `DECIDED` — 2026-11-16, Phase 01.

## D-019 — Inline forms, no dialogs

- **Decision:** New renders as an inline panel in the main column; Edit and Link render inline in the detail panel.
- **Reasoning:** matches the verified Thylas pattern (inline create/delete in `WorkspaceGrid`), avoids modal chrome, keeps the section layout.
- **Alternatives:** modal dialogs; separate full-page forms.
- **Consequences:** only one create form at a time; Esc restores the previous view.
- **Status:** `DECIDED` — 2026-11-16, Phase 02.

## D-020 — Keyword filter is literal substring

- **Decision:** case-insensitive substring over `title` plus typed text fields; toolbar input; visible result count; no ranking.
- **Reasoning:** P2-4 needs locate-ability, not search infrastructure; no index or embedding in MVP.
- **Alternatives:** full-text index; fuzzy/semantic search; no keyword filter.
- **Consequences:** predictable but shallow discovery; Phase 05 evaluation must not claim semantic search.
- **Status:** `DECIDED` — 2026-11-16, Phase 02.

## D-021 — Stance relations are text labels

- **Decision:** `supports` / `challenges` display as literal kind labels with `+` / `−` glyphs; no color encoding and no status change.
- **Reasoning:** prevents stance from being read as verification; keeps detail rows simple.
- **Alternatives:** colored badges; arrows implying truth direction; hiding stance kinds.
- **Consequences:** `RELATIONSHIP_MODEL.md` §5 display rule is now final; detail view carries a "stance only; not verification" note.
- **Status:** `DECIDED` — 2026-11-16, Phase 02.

## D-022 — Physical schema shape

- **Decision:** four tables: `items`, `item_content`, `relations`, `events`; typed nullable columns, no JSONB payload.
- **Reasoning:** explicit identity and relations; queryable fields; smallest explicit model.
- **Alternatives:** one wide `items` table; side tables per type; JSONB field blob.
- **Consequences:** schema changes require a migration and taxonomy reconciliation.
- **Status:** `DECIDED` — 2026-11-18, user approved execution.

## D-023 — API contract and shared modules

- **Decision:** five endpoints; shared modules `src/lib/{items,relations,events,api}.ts`; TS types + shape checks; no zod.
- **Reasoning:** mirrors verified Thylas pattern; one type source for client and server.
- **Alternatives:** per-type endpoints; schema DSL/codegen; server-only types.
- **Consequences:** every UI flow F1–F8 must map to these endpoints; errors use one shape.
- **Status:** `DECIDED` — 2026-11-18, user approved execution.

## D-024 — Local DB and ports

- **Decision:** Docker PG container `gsc-postgres`, host port `55433`; API port `8788`; `DATABASE_URL` in `.env.local`.
- **Reasoning:** avoids the Thylas `55432` / `8787` defaults; no secrets committed.
- **Alternatives:** reuse Thylas ports; external managed DB; embedded PGlite.
- **Consequences:** verification depends on Docker actually starting; no container started yet.
- **Status:** `DECIDED` — 2026-11-18. Ports retained as defaults; Docker daemon unavailable, so PGlite is active (D-026).

## D-025 — Phase 03 test scope

- **Decision:** contract unit tests + repo round-trip tests on Docker PG + API route tests + manual UI screenshots.
- **Reasoning:** covers types, persistence, transport, and rendered UI without browser e2e infrastructure.
- **Alternatives:** no DB tests; full browser e2e framework; test-only mocks for all layers.
- **Consequences:** DB-dependent tests cannot run until P3-1 succeeds; results must be recorded with command and count.
- **Status:** `DECIDED` — 2026-11-18, user approved execution.

## D-026 — Local PGlite fallback is active for Phase 03

- **Decision:** use embedded PGlite at `.data/pglite` as the active local adapter.
- **Reasoning:** D-004 defined PGlite as the fallback if Docker fails; Docker binary exists but daemon is unavailable in this environment.
- **Alternatives:** start Docker PostgreSQL on `55433`; use an external managed database.
- **Consequences:** data persists across process restarts in the local PGlite directory; PostgreSQL adapter remains a future option, not active code.
- **Status:** `DECIDED` — 2026-11-18, fallback condition satisfied.

## D-027 — Context View persistence

- **Decision:** add `contexts` and `context_members`; membership is an explicit ordered `item_id` list.
- **Reasoning:** D-016 requires explicit assembly; no retrieval or inference in MVP.
- **Alternatives:** tag-based membership; JSONB array on Context row; relation-only membership.
- **Consequences:** adding/removing members is an explicit user action; Context Views are separate from Context Space.
- **Status:** `DECIDED` — 2026-11-19, user approved Phase 04.

## D-028 — Context API shape

- **Decision:** `GET/POST/PATCH /api/contexts`, `GET /api/contexts/:id`, `POST/DELETE /api/contexts/:id/members`.
- **Reasoning:** mirrors Phase 04 plan and existing item API contract pattern.
- **Alternatives:** nested item routes; one generic mutation endpoint.
- **Consequences:** context detail returns resolved member items for inspection.
- **Status:** `DECIDED` — 2026-11-19, user approved Phase 04.

## D-029 — Context UI scope

- **Decision:** one Knowledge Context view with add/remove member and open-member actions; no graph or auto assembly.
- **Reasoning:** Phase 02 UI rules and Phase 04 scope.
- **Alternatives:** graph canvas; tag rules; multiple context types.
- **Consequences:** demonstrates Context View concept with minimal UI.
- **Status:** `DECIDED` — 2026-11-19, user approved Phase 04.

## D-030 — Phase order: UI shell inserted as Phase 05

- **Decision:** run the UI shell redesign (per the four screenshots in `ui-prototype/refs/`) as Phase 05; the previous Phase 05 (evaluation & integration prep) moves to Phase 06.
- **Reasoning:** user instruction 2026-11-19 "制定计划，实现这个UI" explicitly requests this work now; the evaluation scenarios should run against the new shell anyway.
- **Alternatives:** run evaluation first; treat the UI work as an untracked parallel track.
- **Consequences:** roadmap row renumbered; Phase 06 depends on Phase 05 output; this is a recorded reorder, not a silent one.
- **Status:** `DECIDED` — 2026-11-19, user instruction.

## D-031 — Visual foundation: light shell

- **Decision:** replace the dark "Quiet Computationalism" tokens with a light shell (white surfaces, rounded cards, grouped sidebar, pill controls) per `ui-prototype/refs/02` and `04`. `MVP_UI_SPECIFICATION.md` §1 tokens are superseded for the shell; its component behavior rules (§4–6) stay in force.
- **Reasoning:** the design board and mockups are unambiguously light-theme; content conflicts are resolved as 01 = content, 02/04 = style.
- **Alternatives:** keep dark tokens; ship a theme switch (two token sets).
- **Consequences:** `tokens.css`, `base.css`, `app.module.css` restyled; screenshots from Phase 02–04 no longer match visually.
- **Status:** `DECIDED` — 2026-11-19, user instruction.

## D-032 — Sidebar structure and Sync placement

- **Decision:** sidebar groups GENERAL (Overview, Recently), INFORMATION (Raw Information, Structured Objects), ORGANIZATION (Contexts, Sync), bottom cluster Settings + Documentation. Sync sits in ORGANIZATION as its own view.
- **Reasoning:** the 01 board lists these as "Sidebar 真正的选项列表" plus the Sync addition; Sync is a page-level data feature, not a utility link.
- **Alternatives:** Sync in the bottom cluster; a separate DATA group; extra rows from the 02 mock (Pipelines, Customers, …) — rejected, those are prototype filler.
- **Consequences:** exactly 8 nav rows; the 02 mock's sidebar contents are not implemented.
- **Status:** `DECIDED` — 2026-11-19, user instruction. See Q2 in `PHASE_05_UI_PLAN.md` if the user prefers the bottom cluster.

## D-033 — Composer behavior without an LLM

- **Decision:** implement the composer UI completely (Ask/Agent/Edit pills defaulting to Agent, provider chip `Local ▾`, model chip defaulting to Deepseek with Rym as the second option, mic button visual, black circular submit); submit captures the text as a `raw.document` item with `source_label` `composer:<mode>`. No LLM inference.
- **Reasoning:** `DESIGN_BOUNDARIES.md` keeps LLM inference outside GSC; a capture action is a real GSC vertical slice instead of a dead button.
- **Alternatives:** disabled submit; call Deepseek directly (needs keys and a provider boundary change).
- **Consequences:** model wiring stays `DEFERRED`; the created items flow into Recently and Raw Information like any other raw item.
- **Status:** `DECIDED` — 2026-11-19. See Q3 in `PHASE_05_UI_PLAN.md`.

## D-034 — Animation layer and quality control

- **Decision:** two effects per the 01 board: (a) mosaic tile overlay on page switch (~350 ms, skippable via Settings toggle), (b) mouse-following dot-grid background (pink/purple tint near the pointer) with quality levels Off/Low/Medium/High/Max persisted in `localStorage`, default Medium as shown in the reference.
- **Reasoning:** both are literal requirements on the spec board; the board itself ships the Off/Max selector as part of the design.
- **Alternatives:** CSS-only hover effect; no quality control; WebGL particle field (overkill).
- **Consequences:** all effects are `pointer-events: none` and quality-gated; weak machines can set Off.
- **Status:** `DECIDED` — 2026-11-19, user instruction.

## D-035 — Canvas view scope

- **Decision:** implement the 04 window as a Canvas view: command bar 「搜索或输入操作」 + `[+]` + panel toggle; empty state 「画布预览」 / 「打开文件...」 with `Ctrl O`; open file uses the existing `POST raw.filecontent` import; preview is a read-only card grid. Canvas is not a sidebar row (D-032's list is authoritative); it opens from Overview and `Ctrl+O`.
- **Reasoning:** matches the screenshot literally while reusing the Phase 03 import path; keeps the sidebar list exactly as specified.
- **Alternatives:** free-drag canvas document (out of scope); separate native window (web MVP is single-window); sidebar row (conflicts with the authoritative list).
- **Consequences:** entry point placement is a flagged open question (Q1); canvas document format does not exist yet.
- **Status:** `DECIDED` — 2026-11-19, user instruction.

## D-036 — Dark mode (D7 of DIVERGENCE_PLAN)

- **Decision:** implement the dark half of D7 now: dark token set behind `[data-theme='dark']` and a Light/Dark switch in Settings, persisted in `gsc.ui.prefs.v1`. The board's own dark palette informs the dark tokens; selected pills invert (accent white, dark text). Background-style presets (dot/diagonal/solid) stay `PROPOSED`.
- **Reasoning:** user instruction 2026-11-19 "开始执行DIVERGENCE_PLAN.md；添加深色模式".
- **Alternatives:** system-preference auto theme; two full theme files; theme editor.
- **Consequences:** all colors flow through CSS variables (hardcoded `#fff` on accent surfaces replaced by `--on-accent`); dot-grid and mosaic tile colors become theme-aware.
- **Status:** `DECIDED` — 2026-11-19, user instruction.

## D-037 — Start rename and the new Overview

- **Decision:** the composer home (logo + 「下一步我们添加什么？」) becomes **Start**; the user plan's **Overview** is a new page — Context Space entry with Space Summary / Recently Updated / Your Contexts. Sidebar GENERAL: Start, Overview, Recently.
- **Reasoning:** user instruction 2026-11-19 "把现在的overview页面改名为Start" plus the layout plan §2 (Overview must be a navigable entry, not a monitoring dashboard).
- **Alternatives:** keep one Overview; name the composer home "Home".
- **Consequences:** `VIEW_TITLES`/docs updated; the composer page keeps all Phase 05 behavior under the new name.
- **Status:** `DECIDED` — 2026-11-19, user instruction.

## D-038 — Two page modes (Collection vs Object Detail)

- **Decision:** lists (Raw/Objects/Contexts/Recently) use Collection View (compact rows, search, filters, column headers); details use full-width Object Detail View with ordered identity blocks. No uniform card dashboard.
- **Reasoning:** user plan §9; objects need different display density and information structure.
- **Alternatives:** right detail panel for everything (Phase 05 behavior); card grid.
- **Consequences:** the 340px aside is removed; clicking a row opens the detail page with a back control; New/Edit/Link panels stay inline.
- **Status:** `DECIDED` — 2026-11-19, user instruction.

## D-039 — Object Detail structure and item deletion

- **Decision:** Object Detail blocks: Header (name/type/edit/delete) · Definition · Properties · Relationships (list) · Sources · Contexts. Add `DELETE /api/items/:id` with cascade over item_content, relations, events.
- **Reasoning:** user plan §5 ("Header：名称、类型、编辑、删除"); the four identity questions (what/from where/related/which contexts) map to these blocks.
- **Alternatives:** soft delete via status (no `deleted` status in the taxonomy); no delete at all.
- **Consequences:** API contract gains one route (documented in D-023 scope); relations to a deleted item disappear with it.
- **Status:** `DECIDED` — 2026-11-19, user instruction.

## D-040 — Recently visit tracking stays client-side

- **Decision:** distinguish 最近访问 vs 最近修改 using a localStorage visit log (`src/lib/visits.ts`); no schema change.
- **Reasoning:** user plan §3 wants both visible and distinguishable; adding `last_accessed_at` to items would change the Phase 03 contract and persistence for a UI concern.
- **Alternatives:** new column + migration; drop the distinction.
- **Consequences:** visit history is per-browser and can be cleared; modification history remains the authoritative record (events).
- **Status:** `DECIDED` — 2026-11-19.

## D-041 — Vision v0.2 adopted; long-range plans folder

- **Decision:** `PRODUCT_VISION.md` updated to v0.2 (user-supplied draft; v0.1 recoverable from git). Long-range planning lives in `plans/` (PLAN-1…PLAN-8 + README index), all `PROPOSED`. `DIVERGENCE_PLAN.md` remains the near-term menu; `plans/` is vision-driven long range.
- **Reasoning:** user instruction 2026-11-20 "这是我们的vision文档，你先存到本地，然后以及为基础制定多个计划（长线计划，记得单独弄一个文件夹）".
- **Alternatives:** keep v0.1 and archive v0.2 separately; fold long-range plans into DEVELOPMENT_ROADMAP.
- **Consequences:** vision vocabulary (Chunk/Cluster/Meta Tag/Light Up/Sync-as-source) does **not** match current code (items/contexts/export-Sync); the mapping table in `plans/README.md` §0 is authoritative for the drift, and PLAN-1 must resolve it before other tracks build on the model. Note the Sync naming collision: current Sync page = export.
- **Status:** `DECIDED` — 2026-11-20 (documentation only; plan contents stay `PROPOSED`).

## D-042 — Chunk is the umbrella term; raw/object duality kept (PLAN-1 Q1)

- **Decision:** "Chunk" becomes the product term for any information unit. Implementation keeps the existing dual classes (`items` rows of `raw.*` and `object.*` with typed content) and the Chunk concept maps to both, documented in `INFORMATION_MODEL.md` §11.
- **Reasoning:** the raw/object split already implements Vision §10-1 "Preserve Before Interpreting" (original content immutable, interpretation separate); merging into one table would rewrite schema, API, UI and both taxonomy docs for no user-visible gain, violating change discipline.
- **Alternatives:** single `chunks` table with a kind column (rejected — large churn, blurs the raw/derived boundary); alias types (rejected — two names for one row).
- **Consequences:** product copy and future docs say "Chunk"; API and schema keep `items`; PLAN-5's fused Chunk view becomes a linked raw↔object presentation, not a schema merge.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-1".

## D-043 — Semantic Name is `title` (PLAN-1 Q2)

- **Decision:** the Semantic Name of a Chunk is the existing `title` field. No new column. Machine proposals for naming arrive through the proposal layer (D-044) and land as `title` updates on acceptance.
- **Reasoning:** `title` already carries "short human label" semantics; adding a parallel `semantic_name` duplicates identity and creates two names to reconcile.
- **Alternatives:** new `semantic_name` column with `title` demoted to auto label (rejected — migration churn, two sources of truth).
- **Consequences:** `INFORMATION_MODEL.md` §5 table annotates `title` as the Semantic Name; PLAN-1 A1-2 drops its "new field or rename" branch.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-1".

## D-044 — Proposals are an independent table (PLAN-1 Q3)

- **Decision:** machine-suggested organization (semantic names, classification, meta tags, associations, cluster membership) lives in a `proposals` table with `pending / accepted / rejected` lifecycle, target item, optional related item, proposed value, rationale and source (`agent` / `detector`).
- **Reasoning:** events are an append-only record of what happened; proposals are undecided things awaiting governance (Vision §10-4). Overloading events would conflate history with pending intent.
- **Alternatives:** new event actions (rejected — no lifecycle state); JSONB queue file (rejected — system of record rule).
- **Consequences:** new table + endpoints in PLAN-1; the review-queue UI stays with PLAN-4; accepted proposals write through normal update paths so history records the change.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-1".

## D-045 — Clusters land now; sidebar and Overview gain the entry

- **Decision:** implement `clusters` + `cluster_members` (a Chunk may belong to multiple Clusters). Sidebar `ORGANIZATION` becomes Clusters, Contexts, Sync; Overview gains an "Existing Clusters" section per Vision §7.
- **Reasoning:** PLAN-1 B1-2 explicitly calls for Clusters in the sidebar and Overview; the Vision dashboard list orders Clusters before Contexts.
- **Alternatives:** clusters as a tag flavor of contexts (rejected — Vision §5.3 keeps them distinct: association vs purpose view); defer UI to a later plan (rejected — B1-2 is in PLAN-1 scope).
- **Consequences:** the D-032 sidebar list (from the earlier UI spec) is amended by this decision; Cluster identity is `title` + `description`; membership is explicit, multi-homed, never inferred.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-1".

## D-046 — Light Up workspace is a view, not a sidebar row (PLAN-2 Q1)

- **Decision:** the Light Up review workspace is a full main-area view (`lightup`) with two tabs — Manual Input (the existing New form) and the acquisition pipeline. Entries: Raw Information `+ Add`, Overview `+ New`, and a Start quick action 「Light Up」. The sidebar list stays as decided (D-032/D-045).
- **Reasoning:** PLAN-2 Q1 asked page vs inline panel; the review stage needs room for segment rows and per-row decisions, and the Vision dashboard (§7) has no separate Light Up page — acquisition is a flow, not a destination.
- **Alternatives:** inline panel on Start (rejected — too cramped for review); new sidebar row (rejected — deviates from the authoritative sidebar list).
- **Consequences:** `+ Add` on Raw Information and `+ New` on Overview now open the workspace (Manual tab = old form, unchanged fields); composer submit and Ctrl+O keep the fast direct-capture path.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-2".

## D-047 — Rule-based segmentation with per-row human control (PLAN-2 Q2)

- **Decision:** segmentation splits on blank-line paragraphs, Markdown headings and horizontal rules; tiny fragments merge into the previous chunk. Every row is editable/discardable before persist. Smart segmentation belongs to PLAN-4 (Agent).
- **Reasoning:** PLAN-2 Q2 asked auto vs user-specified granularity; user control lives at the row level (edit/discard), which satisfies "User Review" without an agent.
- **Alternatives:** fixed-size token windows (rejected — meaningless chunks); single monolith per input (rejected — skips segmentation entirely).
- **Consequences:** `src/lib/lightup.ts` holds the pure segmentation rules with tests; the review table is the step-7 gate — nothing persists without confirmation.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-2".

## D-048 — URL ingestion is fetch-and-preview only

- **Decision:** `POST /api/ingest/url` fetches the page server-side (10s timeout, 2MB cap) and returns extracted title + plain text. It never persists; persisted items are always created through the review path or the fast direct-capture path.
- **Reasoning:** browser CORS prevents client-side fetching of arbitrary URLs; ingestion (step 2) must stay separate from persistence (step 8) per the Light Up pipeline and "Preserve Before Interpreting".
- **Alternatives:** client-side fetch via proxy service (rejected — external dependency); server auto-save on fetch (rejected — skips User Review).
- **Consequences:** one new endpoint; extraction is naive HTML→text (no OCR, no PDF — boundary unchanged); failures map to `internal` (retryable) or `contract` (bad URL).
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-2".

## D-049 — Naming: Sync = source acquisition; export page becomes Export (PLAN-3 前置)

- **Decision:** the sidebar gains an `Export` row (the current export page content) and `Sync` becomes the new external-source acquisition page per Vision §3.2. Sidebar `ORGANIZATION` = Clusters, Contexts, Sync, Export. Settings → Data Management keeps its export buttons unchanged.
- **Reasoning:** PLAN-3 flagged the naming collision; the Vision reserves "Sync" for ongoing acquisition. Renaming the export page preserves its functionality (change discipline) while freeing the name.
- **Alternatives:** move export under Settings only (rejected — removes a standalone page); call the new page "Sources" (rejected — deviates from Vision vocabulary).
- **Consequences:** DocsView text updated; `SyncView` (export) renamed `ExportView` in code.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-3".

## D-050 — Synced items keep `origin: import`; secrets stay out of DB and git

- **Decision:** the `ORIGINS` vocabulary (`user | import | agent`) is unchanged (D-022); synced items use `origin: import` with `source_label` `sync:<kind>:<ref>` (e.g. `sync:github:owner/repo#42`) as the provenance chain. Source tokens are stored in `.data/secrets.json` (gitignored), never in the database, never in git.
- **Reasoning:** "who created it" already distinguishes user/agent from ingestion; adding a `sync` origin churns the Phase 01 taxonomy for no user-visible gain. PLAN-3 boundary requires keys on-machine only.
- **Alternatives:** `origin: sync` enum extension (rejected — taxonomy churn); token column in `sources` table (rejected — boundary says 不入库).
- **Consequences:** `sources` table holds metadata only (kind/label/scope/status/frequency/last_sync/last_error); a small secrets file store lives at `server/storage/secrets.ts`.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-3".

## D-051 — GitHub first; manual sync default (PLAN-3 Q1/Q2)

- **Decision:** source priority GitHub → Notion → Drive → X; v1 ships the GitHub adapter (token + `owner/repo` label, pulls issues as raw items) with adapter interface ready for the rest. Sync frequency default is **manual** ("Sync now"); `daily` is an optional setting value; webhooks are out. Dedupe on re-sync by exact `source_label` match.
- **Reasoning:** PLAN-3 Q1/Q2 recommended exactly this order and a controllable default; GitHub is the only token-based source testable without OAuth app registration.
- **Alternatives:** OAuth-first Notion/Drive (blocked — needs app credentials and user authorization flows); webhook-driven sync (rejected — C3-1 territory).
- **Consequences:** B3-1 (X/Notion/Drive official connect + brand assets) is blocked on credentials and network; this environment has no external network, so the GitHub adapter is verified with stubbed fetch and marked for real-network verification.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-3".

## D-052 — LLM provider: OpenAI-compatible adapter, config-driven (answers D1)

- **Decision:** one OpenAI-compatible chat-completions adapter (`server/agent/llm.ts`) configured by `GSC_LLM_BASE_URL` / `GSC_LLM_API_KEY` / `GSC_LLM_MODEL` (defaults to the Deepseek API shape). Local OpenAI-compatible endpoints (llama.cpp / Ollama / LM Studio) work by pointing `BASE_URL` at localhost. Fetch is injectable; tests use a stub provider.
- **Reasoning:** PLAN-4 Q2 deferred provider choice here; a config-driven OpenAI-compatible client covers both D1 options (cloud Deepseek and local endpoints) with one implementation.
- **Alternatives:** hardcode Deepseek SDK (rejected — locks out local endpoints); per-provider adapters now (rejected — premature).
- **Consequences:** real model calls are unverified in this offline environment (stub-tested); composer model chips remain display-only until a later wiring pass; `.env.example` documents the three variables.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-4".

## D-053 — One review queue; kinds extended with dedupe and metadata

- **Decision:** Agent and Detector outputs share the `proposals` table and one review-queue UI. `PROPOSAL_KINDS` gains `dedupe` (duplicate candidates) and `metadata` (missing-source/field findings) — additive only. The queue lives as a third tab 「提案队列」 of the Light Up workspace, with a compact 待审提案 section on Overview linking there.
- **Reasoning:** PLAN-4 A4-1 asks for a queue; one governance surface is simpler than two, and the Vision places organization activity on Overview (§7). Keeps the sidebar list unchanged.
- **Alternatives:** separate candidates table (rejected — two governance flows); sidebar page (rejected — authoritative list).
- **Consequences:** contract + tests updated; queue filters by status; source tag distinguishes agent vs detector rows.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-4".

## D-054 — Accept semantics per kind; single-process, manual triggers (PLAN-4 Q1)

- **Decision:** accept applies what the model can apply today: `semantic_name` → title update (history event recorded), `association` → `related_to` relation, `cluster` → create Cluster with target (+related) as members; `classification` / `meta_tag` / `dedupe` / `metadata` resolve as review-marked only, with the UI saying so explicitly. Reject only resolves. Agent and Detector are single-process modules with manual triggers (「Agent 建议」/「运行 Detector」); no daemon.
- **Reasoning:** PLAN-4 Q1 suggested single-process first to validate the boundary; Vision §10-4 requires proposals never write user data directly — applying only well-defined kinds keeps governance honest.
- **Alternatives:** apply-all on accept (rejected — meta tags/dedupe have no model to write yet); background scheduler (rejected — C4-1 territory).
- **Consequences:** accepting a semantic_name records an ordinary `updated` event; unapplied kinds carry a visible "resolve-only" note; detection dedupes against existing pending proposals.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行PLAN-4".

## D-055 — Semantic color dictionary (PLAN-5 Q1)

- **Decision:** four fixed semantic colors in `tokens.css` (both themes): `--sem-original` 原文灰 (#6B7280 / dark #9CA3AF), `--sem-confirmed` 用户确认绿 (#16A34A / #4ADE80), `--sem-machine` 机器提议紫 (#9333EA / #C084FC), `--sem-alert` 异常红 (#DC2626 / #F87171). Every color use carries a text label (accessibility: color never sole encoding).
- **Reasoning:** PLAN-5 Q1 deferred the palette until PLAN-1 settled categories — done (D-042); the board's requirement is stable, meaningful color semantics.
- **Alternatives:** per-type rainbow palette (rejected — arbitrary assignment ban in Vision §8).
- **Consequences:** `SemTag` chips on detail blocks and list rows; legend on Overview and Documentation.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行05".

## D-056 — Activity density map on Overview; click a day filters Recently

- **Decision:** the GitHub-contributions-style density map (PLAN-5 Q2 → Overview) shows the last 12 weeks; cell intensity = activity count; event segments colored by the dictionary: created = 原文灰, updated = 确认绿, pending machine proposals = 机器紫. Clicking a day jumps to Recently filtered to that day.
- **Reasoning:** PLAN-5 Q2 recommended Overview (Vision §7 "organization activity"); the verification matrix requires click-to-filter.
- **Alternatives:** map on Recently (rejected — per plan recommendation); click-to-drill in place (deferred to C5-1).
- **Consequences:** `RecentlyPage` accepts a day filter with a removable chip; map buckets built from `created_at` / `updated_at` / pending proposals.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行05".

## D-057 — Membership badges stay neutral; linked raw↔object view (PLAN-5 B5-2)

- **Decision:** Cluster/Context membership is shown as neutral pill badges (text + distinct icon) on list rows and detail headers — the four semantic colors stay reserved for state. Per D-042 (no schema merge), the B5-2 "融合详情" branch becomes a linked pairing: every detail page gains a paired-jump chip (raw → derived objects, object → sources) on top of the existing Sources/被引用 blocks.
- **Reasoning:** Vision §8 forbids arbitrary color assignment; membership is identity, not state. The pairing chip answers "where is the other half of this Chunk" in one click.
- **Alternatives:** membership ribbon colors per cluster (rejected — unstable semantics); merging detail pages (rejected — D-042).
- **Consequences:** badge component with ⊘/◈-style icons; `SemTag` covers state only.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行05".

## D-058 — Minimal token auth enters scope (boundary amendment)

- **Decision:** `DESIGN_BOUNDARIES.md` is amended: a minimal PAT-style token layer is now in scope — tokens in `.data/api-tokens.json` (sha256-hashed, gitignored) with `read` / `rw` scopes, enforced only when `GSC_AUTH_REQUIRED=1`. Without the flag the local API stays open (loopback dev). Token minting via `scripts/create-token.mjs`.
- **Reasoning:** PLAN-6 A6-2 required approval to cross the "no permission system" boundary; user instruction "开始执行06" is that approval; tokens are the smallest authorization that makes "未授权读不到私有信息" testable.
- **Alternatives:** full user/permission system (PLAN-7 territory); always-on auth (rejected — breaks the local frontend until a token UI exists).
- **Consequences:** router gains an auth gate for `/api/v1/*` when enabled; frontend keeps working in open mode; scope granularity (per-cluster) deferred to C6-1/PLAN-7.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行06".

## D-059 — MCP: hand-rolled stdio server over the HTTP API

- **Decision:** `server/mcp/index.ts` implements the minimal MCP stdio surface (JSON-RPC 2.0: `initialize`, `tools/list`, `tools/call`) with tools `gsc_get_chunk`, `gsc_list_chunks`, `gsc_browse_clusters`, `gsc_browse_contexts`, `gsc_get_context`, `gsc_propose`. It calls the HTTP API (never opens PGlite directly — single-connection embedded DB). No new npm dependencies; official SDK swap is a later option. stdio first (PLAN-6 Q1); `GSC-CONTEXT.md` export stays as the offline fallback (Q2).
- **Reasoning:** API and MCP must share one domain contract (Vision §6.3); hand-rolling the small protocol surface avoids a dependency and is testable with a stub fetch.
- **Alternatives:** MCP SDK dependency (rejected — dependency discipline); MCP opening the DB (rejected — PGlite lock + duplicated contract); HTTP-remote MCP (deferred).
- **Consequences:** `npm run mcp` runs the server with `GSC_API_URL` + `GSC_API_TOKEN`; tools return JSON text content; updates/creates go through `gsc_propose` only (governance preserved).
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行06".

## D-060 — Contract freeze: /api/v1/ prefix + API_CONTRACT.md

- **Decision:** all endpoints accept `/api/v1/*` (the existing `/api/*` stays as a documented alias); `API_CONTRACT.md` freezes the v1 surface (endpoints, DTO sources of truth, error kinds/status mapping). The SDK is a single-file fetch client `sdk/gsc.mjs` (+ README example); Python SDK deferred.
- **Reasoning:** PLAN-6 A6-1 calls for a versioned, locked contract; alias keeps the existing frontend and tests untouched while giving external consumers a stable prefix.
- **Alternatives:** hard rename to /api/v1 only (rejected — breaks client and checks in one step); OpenAPI codegen (rejected — heavy for this stage).
- **Consequences:** router normalizes the prefix; contract tests remain the enforcement; docs updated.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行06".

## D-061 — Local minimal identity (PLAN-7 Q1)

- **Decision:** self-built minimal identity: `users` table (id/name/created), seeded default user `usr_local`. API tokens bind to a user (`tokens.ts` gains `userId`); in open mode every request runs as `usr_local`. `items.owner_id` and `clusters.owner_id` columns land now (PLAN-7 four-separation). No passwords, no login UI — identity is token ownership inside the machine trust boundary.
- **Reasoning:** PLAN-7 Q1 asked self-built vs external IdP; external identity needs network/OAuth and is overkill for the local MVP, and the token layer from D-058 already maps naturally to users.
- **Alternatives:** OAuth/external IdP (rejected — offline, later via C7-1/PLAN-8); session login UI (rejected — no web auth scope).
- **Consequences:** `DESIGN_BOUNDARIES.md` amendment #2 (below) enters sharing/roles scope; ownership is stamped on create; existing rows default to `usr_local`.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行07".

## D-062 — User-targeted cluster sharing, view/add roles first (PLAN-7 Q2)

- **Decision:** `cluster_shares(cluster_id, user_id, role: view|add)` — owner invites a user by name/id with a role. Read-only share links are deferred to C7-1. Revocation deletes the share and takes effect immediately (rules evaluated per request). Every grant/revoke writes a `cluster_share_events` audit row.
- **Reasoning:** the plan's verification scenario is role-based (A shares to B with roles; revoke is instant); links can layer on later without redesign.
- **Alternatives:** read-only share links first (rejected — cannot express the add role or the four separation); edit/admin roles now (deferred to B7-2 per plan).
- **Consequences:** visibility rule: a shared user can read the cluster and its member chunks (and add members with role=add); everything else of the owner stays invisible. Owner keeps all control.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行07".

## D-063 — Enforcement scope for B7-1

- **Decision:** visibility/ownership enforcement covers **items and clusters** in this stage. Contexts, proposals and sources stay single-user surfaces (any valid token in auth mode; full owner split with PLAN-8 visibility governance). Item mutations remain owner-only.
- **Reasoning:** PLAN-7 B7-1 is the shared-cluster MVP; extending owner columns to every table now would churn PLAN-8's governance design (Meta Tag scopes) for no verification gain.
- **Alternatives:** enforce everything now (rejected — scope); no enforcement (rejected — verification requires privacy).
- **Consequences:** documented gap in KNOWN_ISSUES; PLAN-8 must extend the same rules to contexts/tags.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行07".

## D-064 — Meta Tag first dimensions and controlled definitions

- **Decision:** Pre-seed the six Vision §5.4 dimensions (Thinking Style, User Profile, Expertise, Interest, Methodology, Project Association) as `tag_definitions`. Tag **definitions are controlled** (must exist before assignment); **values are free** (any string). No folksonomy.
- **Reasoning:** Vision explicitly warns against "arbitrary, inconsistent tags becoming an unmanageable taxonomy"; controlled definitions with free values is the minimal guard that still allows growth.
- **Alternatives:** free tags (rejected — the exact failure Vision calls out); fully controlled values too (rejected — overkill at this stage).
- **Consequences:** assignment API rejects unknown dimension ids with `contract`; a definition-management UI (Settings area) is required (A8-1).
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行08".

## D-065 — `domain` stays; Meta Tags run in parallel

- **Decision:** Keep the existing `items.domain` field untouched. Meta Tags are an additive layer; `domain` is not merged into tags in this phase.
- **Reasoning:** PLAN-8 Q2 suggested merging, but `domain` is wired through filters, forms and tests across PLAN-1…PLAN-7; merging now is churn with no verification gain. A tag value with the same semantic can shadow it later (C8-1).
- **Alternatives:** merge `domain` into tags now (rejected — high churn, deferred to a future cleanup).
- **Consequences:** two coexisting classification mechanisms documented in INFORMATION_MODEL; possible future deprecation of `domain`.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行08".

## D-066 — User Profile aggregation and output

- **Decision:** User Profile = aggregation of **user-confirmed** values on the `User Profile` dimension (plus curated statements), presented on a read-mostly profile page with confirm/remove. Read-only output at `/api/v1/profile` and MCP tool `gsc_get_user_profile`. Tags carry owner_id and follow PLAN-7 visibility rules; profile output returns only the viewing user's own confirmed values.
- **Reasoning:** Vision §5.4 positions User Profile as the cross-application category; "Automation With Human Governance" forbids inference-style profiling. Only user-confirmed facts go out to external agents.
- **Alternatives:** psychological inference over all chunks (rejected — explicitly out of boundary); output all tags (rejected — leaks unrelated dimensions).
- **Consequences:** profile endpoint is the contract for PLAN-6 consumers; Detector-style tag suggestions are C8-1 only.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行08".

## D-067 — Global optimization plan staged as O1–O5 (backend commercialization first)

- **Decision:** `GLOBAL_OPTIMIZATION_PLAN.md` defines "commercially deployable" as five gates (correct/secure/observable/operable/regressible) and stages the work M1 hardening → M2 observability+CI → M3 deployment-ready → M4 release gate. Backend hardening (O1, incl. error semantics, SSRF guard, transactions, rate limiting) takes priority over frontend polish.
- **Reasoning:** eval (4.0/5) found all blockers on the "commercial runtime" surfaces — error semantics, scale, data-safety ops — not on features. Code sweep confirmed zero lint/transactions/logging/health/CORS and open SSRF on URL ingest.
- **Alternatives:** feature-first continuation (rejected — commercial bar is the ask); big-bang rewrite (rejected — evidence-based incremental tasks).
- **Consequences:** plan is `PROPOSED`; three open choices (Postgres deployment form, secrets encryption method, CI carrier) gate O2-5/O1-6/O3-3.
- **Status:** `DECIDED` — 2026-11-20, user instruction "制定全局优化计划" (documentation only; contents stay PROPOSED).

## D-068 — PostgreSQL deployment form for O2-5

- **Decision:** Implement the `DB_ADAPTER=postgres` adapter first and verify against **self-hosted docker** (compose file provided). Managed-hosting selection (Supabase etc.) is deferred until there is a deployment target.
- **Reasoning:** commercial backend must be Linux-deployable; the adapter is the gating artifact, hosting is an ops choice made later.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行这个计划" (M1 scope; O2-5 lands in M3).

## D-069 — Secrets encryption method

- **Decision:** AES-256-GCM with a master key from `GSC_SECRETS_KEY` env or auto-generated keyfile `.data/secrets.key`; stored format `v1:iv:tag:ciphertext`. Legacy plaintext values keep working (re-encrypted on next write). DPAPI becomes a later Windows-only enhancement.
- **Reasoning:** the commercial backend targets Linux servers — DPAPI would be Windows-only. AES-GCM + keyfile is portable, testable, and honestly documented as keyfile protection (not HSM).
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行这个计划".

## D-070 — CI carrier

- **Decision:** GitHub Actions workflow (`.github/workflows/ci.yml`: lint + check + test:cover + build + api:check) **plus** a local pre-commit hook doing the same fast checks. Agent environment has no GitHub credentials — the user pushes the workflow.
- **Reasoning:** matches the repo's git workflow; local hook gives immediate feedback without network.
- **Status:** `DECIDED` — 2026-11-20, user instruction "开始执行这个计划" (workflow lands in M2 with lint).

## D-071 — Light Up redesign: one Studio, honest provenance, zero backend change

- **Decision:** `LIGHT_UP_UX_VISION.md`/`_INTERACTION_SPEC.md`/`_IMPLEMENTATION_PLAN.md` define the redesign. Capture→Understand→Shape→Curate→Illuminate live in one Studio view (stage kicker). Semantic Object Sheet is the review unit; three states (original/machine/user) are visually distinct via `SemTag`. Segment offsets map chunks back to source text with an honest "no precise source ref" fallback — never faked. Curation (accept/edit/reject/defer/merge/split/bulk) operates on un-persisted rows only; persistence stays the existing per-item `POST /api/items` + `POST /api/tags/values` contracts (D-047 gate preserved). Fast path and manual form unchanged.
- **Reasoning:** spec requires preserving the governance boundary and backend contracts; merge/split/defer need no new APIs because they act inside the human-review gate. Completion experience (Illuminate) consumes real create responses only.
- **Alternatives:** wizard with persisted drafts (rejected — invents state); fake source highlight (rejected — spec forbids); LLM segmentation now (rejected — deferred to PLAN-4 C4-1).
- **Consequences:** `lightup.tsx` rewritten as `LightUpStudio`; `SegmentRow` replaced by `Sheet`; split operates at mid-content paragraph boundary (cursor-accurate split deferred); offsets are session-scoped (not persisted).
- **Status:** `DECIDED` — 2026-11-20, user Light Up UX Redesign spec.

## D-072 — Same-origin requests carry Origin; CORS gate compares hosts

- **Decision:** The O1-7 CORS gate allows requests whose `Origin` host equals the `Host` header without consulting the allowlist (and without emitting CORS headers). Cross-origin requests still require `GSC_CORS_ORIGINS`. Vite dev proxy keeps `changeOrigin: false` so the browser Host survives.
- **Reasoning:** browsers send `Origin` on same-origin POSTs; the initial M1-A gate rejected them (surfaced as Light Up persist failing with 403 in the browser while curl probes passed). Regression test added.
- **Status:** `DECIDED` — 2026-11-20, bug found in Phase 4 verification of the Light Up redesign.

## D-073 — Phase 02 hardening scope (idempotency, integrity, backup, logging)

- **Decision:** Idempotency-Key support on `POST /api/items`, `POST /api/relations`, `POST /api/proposals/:id/resolve` (replay stored 2xx, 409 on same-key/different-body); `tag_values` unique on (definition, COALESCE(item_id,''), value, scope) with earliest-row dedupe; `db:backup`/`db:restore` tooling with confirm-gated restore; structured JSON request logs with `X-Request-Id` and a sensitive-field denylist. Soft delete stays DEFERRED (O4-1).
- **Reasoning:** spec §4 names duplicate-confirmation as a hard requirement; §8 requires predictable deletion/recovery and safe logging. Scope kept minimal — no workflow engine, no event sourcing.
- **Consequences:** new `idempotency_keys` table (0007); additive `X-Request-Id` response header; duplicate tag assignment now 409 (was silently duplicated).
- **Status:** `DECIDED` — 2026-11-20, user Backend Foundation spec.

## D-074 — Restore semantics deviate to overwrite mode under sandbox delete hooks

- **Decision:** `db-restore.mjs` attempts directory rename-aside first; when the environment intercepts deletes/renames (safe-delete shim), it falls back to copy-aside + overwrite-in-place. Restored state is authoritative; stale relation files (unknown OIDs) are ignored by PostgreSQL.
- **Reasoning:** the safe-delete trash mechanism cannot handle database directories on this dev machine; bypassing the safety hook is not acceptable, so the restore path degrades to a non-destructive copy strategy and documents the tradeoff.
- **Consequences:** restore drill verified end-to-end (deleted item recovered); limitation recorded in KNOWN_ISSUES.
- **Status:** `DECIDED` — 2026-11-20, discovered during the Phase 02 restore drill.

## D-075 — Xiaomi MiMo becomes the default LLM provider

- **Decision:** Default `GSC_LLM_BASE_URL=https://api.xiaomimimo.com/v1`, `GSC_LLM_MODEL=mimo-v2.6-flash` (pro variants env-switchable). The adapter sends both `Authorization: Bearer` and `api-key` headers (MiMo accepts either), disables deep thinking via `thinking:{type:'disabled'}` on MiMo hosts, and reads `content` only — `reasoning_content` is never surfaced or logged. Key is filled manually by the user in `.env.local`; `npm run llm:check` verifies connectivity. Composer model chip defaults to "MiMo".
- **Reasoning:** user is on the MiMo token plan; the endpoint is OpenAI-compatible so the D-052 adapter needed only protocol quirks handling. Deep thinking off keeps semantic-name suggestions fast and cheap; structured output already goes through `extractJson`.
- **Alternatives:** new provider abstraction (rejected — one OpenAI-compatible adapter suffices); Deepseek default kept (rejected — user explicitly chose MiMo).
- **Consequences:** `server/agent/llm.ts` + `config.ts` defaults + `.env.local` placeholder + `scripts/llm-check.mjs`; 6 new adapter tests (headers/thinking/reasoning tolerance/keyless local/error snippet).
- **Status:** `DECIDED` — 2026-11-20, user instruction "现在接入真实API，小米mimo的token plan，你先开发，然后我手动填充API KEY".

## D-076 — Settings UI owns LLM provider config; Token Plan hosts for tp- keys

- **Decision:** Settings gains a dedicated **Model** page (base URL / model / API key + 测试连接). The key is write-only through `PATCH /api/llm/config` and stored in the AES-GCM secret store (`llm_api_key`); `GET` returns only `key_set` + a 4-char hint. Effective config resolves at call time (Settings overlays env) so saves apply without restart. `POST /api/llm/check` runs a real probe from the server. Additionally, the default base URL is corrected to the **Token Plan CN cluster** `https://token-plan-cn.xiaomimimo.com/v1` — `tp-*` keys (the user's format) are rejected by `api.xiaomimimo.com`; verified live (`llm:check` PASS, real semantic-name suggestions returned).
- **Reasoning:** user asked for in-Settings model/key configuration; keeping the key out of the browser and encrypted at rest preserves the D-069 security posture. The Token Plan ToS limits usage to coding tools — user chose this plan explicitly; noted for their awareness.
- **Consequences:** `server/storage/settings.ts`, `/api/llm/config` + `/api/llm/check`, Settings→Model UI, client API functions; tests assert key never echoed and encrypted at rest.
- **Status:** `DECIDED` — 2026-11-20, user instruction "在setting添加专门配置model和apikey的地方".

## D-077 — UI internationalization: zero-dependency zh/en switch

- **Decision:** Lightweight in-repo i18n (`src/lib/i18n.tsx` context + `src/lib/strings.ts` flat zh/en dictionary, ~230 keys). Language lives in prefs (`gsc.ui.prefs.v1`), switchable from Settings → General → Language (中文 default). `relativeTime` and time groups are language-aware; product names (GSC / Light Up / Meta Tags / model ids) stay untranslated by design. Full coverage of sidebar, Start/Overview/Recently/Settings, collections, details, Sync/Export/Docs/Canvas, Light Up Studio, Semantic Object Sheet, TagEditor, Composer.
- **Reasoning:** the repo avoids unnecessary dependencies (spec §8); a flat tuple-free dictionary with fallback-to-zh is the smallest coherent mechanism. Chinese is the default to match the user base.
- **Consequences:** ~230 keys in `strings.ts`; every view component binds `useT()`/`useRelativeTime()`; verified bilingual via screenshots (zh/en Start+Overview+Settings); leftover scanner clean.
- **Status:** `DECIDED` — 2026-11-20, user instruction "添加语言切换（国际化）功能".

## D-078 — Commercial-grade zero-dependency URL router

- **Decision:** Introduce a client-side URL router. `src/lib/router.ts` = generic zero-dep router
  (History API, `:param` matching, `navigate/replace/back`, `useLocation` via `useSyncExternalStore`);
  `src/app/routes.ts` = GSC route table (`parsePath`/`buildPath` + typed builders) mapping URL ↔
  nav state (`view` + `itemId` + `contextId` + `clusterId` + `recentDay?day=`). App seeds state from
  the URL on load (deep links), re-derives on `popstate` (back/forward), and mirrors state→URL
  (pushState) with equality guards. Unknown URLs render a 404 with a "go home" action. Hand-rolled
  (no `react-router`) to honor the repo's zero-dependency principle.
- **Reasoning:** navigation was pure React state (`go()`), so the address bar never reflected location —
  no shareable/bookmarkable URLs, broken Back button. Commercial SPAs drive the view from the URL.
  A dependency-free router matches GSC's existing ethos (zero-dep i18n, metrics). The mirror design
  (state ↔ URL with guards) gives react-router-equivalent behavior without rewriting the ~20 existing
  nav `setState` call sites or the 1200-line render tree (AGENTS.md: don't rewrite unrelated code).
- **Alternatives:** `react-router` (rejected — adds a dependency without recorded need; repo is zero-dep);
  full URL-as-source-of-truth rewrite (rejected for now — higher risk to the large App tree; mirror
  delivers identical UX). Backend `server/router.ts` untouched (already a routing system).
- **Consequences:** `src/lib/router.ts`, `src/app/routes.ts`, App state↔URL sync + 404 gate,
  `notFound.*` i18n keys, `routes.test.ts` + `router.test.ts`. Deep links, back/forward, 404 verified.
- **Status:** `DECIDED` — 2026-11-21, user instruction "用商业化的标准制定项目的路由系统并执行".

## D-079 — Overview Canvas: Expandable Information Tree (DECIDED — executed 2026-11-21)

- **Decision (PROPOSED):** Add a **Canvas mode to Overview** (Overview | Canvas toggle) rendering a
  progressively-expandable information tree: root `My Information Space` → domains (Raw / Structured
  Objects / Clusters / Contexts) → categories (by actual item type) → individual objects. Selecting an
  object navigates to its existing detail page. Deterministic zero-dependency frontend tree layout (no
  react-flow/d3); **reference-node dedup** for multi-parent objects (a Chunk in several Clusters/
  Contexts appears once as an object + as reference nodes on other paths); containment = membership
  (cluster/context `member_ids`), `relations` deferred. Reuses existing APIs (`src/services/api.ts`
  `listItems({type,domain,q})` / `listClusters` / `listContexts`) — **no backend change, no new
  dependency, no canonical data model change**.
- **Reasoning:** vision "Overview Canvas — Expandable Information Tree"; the Canvas is a navigational
  projection of the Information Space, not the data model. Zero-dep + no graph DB honors AGENTS.md
  boundaries; membership-based containment avoids implying single-parent ownership.
- **Alternatives:** graph library (react-flow/d3) (rejected — large dep, not needed for MVP tree);
  backend tree endpoint (rejected — existing list APIs suffice); canonical object duplication
  (rejected — reference nodes instead).
- **Status:** `DECIDED` — 2026-11-21, user approved "开始执行" (implement Phase C). Plan: `CANVAS_PLAN.md`.

## D-080 — Button Reality Audit & Optimization Plan (DECIDED — executed 2026-11-21)

- **Decision (PROPOSED):** Full audit of every clickable element in GSC (~170 across 21 files) classified
  REAL / FAKE / PARTIAL by tracing each handler body to its final call (`api.*` / `downloadArtifact` /
  `go/navigate` / real toggle). Verdict: the overwhelming majority are REAL (CRUD, navigation, export,
  tags, proposals, news, account, theme/lang/view, onboarding). Problems concentrate in the **Sync &
  Export data-source domain** + one decorative dead button. Optimize via P0 (wire `POST /api/sources/:id/sync`
  to the already-built Web Intelligence adapters `getAdapter(kind)+extract+pipeline`, replacing the
  github-only branch; remove the dead mic button), P1 (URL capture persists via capture→Light Up→confirm;
  persist the session-only "accept" review state), P2 (honest notion/drive/x token paths + full-domain
  regression). Plan: `BUTTON_OPTIMIZATION_PLAN.md`.
- **Reasoning:** user instruction "全盘审查…我希望每一个按钮都真实可用，否则制定优化计划". Key insight: the
  multi-source adapters (`server/intel/adapters/`) are already real (web/rss/file/github + notion/drive/x
  token, with `extract.ts`/`pipeline.ts`, 7 tests) but the sync route (`router.ts:808`) still returns
  "not implemented" for non-github — so real-izing data sources is **wiring**, not building from scratch.
- **Alternatives:** build 6 separate source integrations (rejected — adapters already exist); full OAuth
  now (deferred to B3-1 — token path is genuinely usable first); keep mic button as decoration (rejected —
  violates "every button real").
- **Status:** `PROPOSED` — 2026-11-21, awaiting user approval to execute.

## D-081 — Full Productization Sprint: sync real-ization + IDOR hardening + responsive (DECIDED)

- **Decision:** Executed the productization sprint. (1) Wired `POST /api/sources/:id/sync` to the
  Web Intelligence adapter pipeline (`runSourceSync`) for web/rss/file/notion/drive/x (was a fake
  "not implemented" screen); made `processSnapshot` proposal generation best-effort so an LLM failure
  never fails a raw import. (2) Security: fixed a destructive IDOR on `POST /api/items/:id/restore|purge`
  (added owner checks) and added owner isolation for contexts + sources via migration
  `0011_owner_scoping.sql` (ADD COLUMN `owner_id`, backward-compatible) + create-time owner assignment
  + backend enforcement. (3) Removed the dead Composer mic button. (4) Added `≤720px` responsive shell
  (sidebar collapses to a top strip, main full-width). Verified: tsc=0, vitest 119/119, build passes.
- **Reasoning:** user directive "Full Productization Sprint — resolve what prevents commercial
  usability." Key insight (D-080): data-source real-ization = wiring, not building. Security: contexts/
  sources lacked `owner_id`, so they weren't isolated at all; sources hold tokens (security-critical).
- **Alternatives:** keep sync synchronous-only (kept — worker is P1); force OAuth now (deferred to B3-1,
  token path is real); full mobile redesign (deliberate minimal adaptation instead).
- **Status:** `DECIDED` — 2026-11-21, executed. Report: `PRODUCTIZATION_REPORT.md`.

## D-082 — Web Intelligence capture MVP: URL → extract → persist journey (DECIDED)

- **Decision:** Completed the Web Intelligence extraction MVP journey. Added `POST /api/capture` (URL →
  capture task → SSRF → fetch → extract → persist raw item + semantic proposals) + `GET /api/capture/:id`,
  through the real capture-task lifecycle (create → processing → completed/failed) via
  `createTask`/`updateTask`/`processCaptureTask`. Processing is inline (smallest reliable implementation);
  a background worker draining `capture_tasks` via `claimNextTask` is the documented next step. Added the
  Dashboard entry: Light Up URL section gets a "采集入库 (Capture & store)" button (`api.captureUrl`) that
  captures the URL into GSC and routes its proposals to the existing review→confirm queue. New journey test.
- **Reasoning:** user asked whether the extraction MVP was implemented. Verdict: the extraction **core**
  (adapters/extract/processSnapshot/snapshots) was already built + tested, but the journey (capture API +
  Dashboard entry) was missing. Completed it by reusing the existing pipeline — no new extraction logic.
- **Alternatives:** separate async worker now (deferred — inline is reliable for single-URL capture);
  duplicate a second confirmation flow (rejected — reuses existing proposal→confirm); a new capture UI page
  (rejected — extended the existing Light Up URL section).
- **Status:** `DECIDED` — 2026-11-21, executed. Verified: tsc=0, vitest 120/120, capture UI screenshot.

## D-083 — Information Experience Overhaul: editorial presentation system + Raw source library (DECIDED)

- **Decision:** Began the Information Experience Overhaul (goal: information product, not DB admin). Built the
  shared editorial presentation system — type scale (page/title/section/object/body/meta/caption) + spacing
  scale + **comfortable/compact density** (new `density` pref → `<html data-density>`, toggled in Settings) in
  `tokens.css`/`prefs.ts`/`App.tsx`/`pages.tsx`. Applied the scale to shared row/detail/reader classes
  (`views.module.css`). Redesigned **Raw Information** as a source library (Part 4.2): content preview per row,
  clean source attribution (api.github.com / author) with the raw technical `source_label` (sync:web:…) removed
  from primary display, reading measure on content. Verified: tsc=0, vite build, vitest 120/120, screenshot.
- **Reasoning:** user directive "Information Experience Overhaul." Part 3 (presentation system) is the reusable
  foundation; Part 4.2 (Raw source library) is the flagship "reading over inspecting" demonstration. Typography +
  density lift every page; hiding technical source metadata removes the "engineering DB" feel.
- **Alternatives:** page-by-page bespoke redesign (rejected — shared system scales better); a big component
  library (rejected — presentation system over abstraction, per directive §3); redesigning all pages this pass
  (continuing — foundation + flagship verified first, then extend to Objects/Detail/Light Up/Canvas).
- **Status:** `DECIDED` — 2026-11-21, in progress (Stage A/B + Stage C-Raw done; remaining pages continuing).
  Working doc: `INFORMATION_EXPERIENCE_OVERHAUL.md`.

## D-084 — Model config: per-provider profiles, credentials and request shapes (DECIDED)

- **Decision:** Made the Settings → Model page truly usable per provider ("different providers require
  different things"). New shared registry `src/lib/providers.ts` (used by UI and server): per-provider auth
  style, default endpoint, model presets, key format (tp-… / sk-… / AIza… / id.secret) and console URL.
  `llm.ts` now sends provider-specific request shapes (Claude: x-api-key + anthropic-version + max_tokens;
  Gemini: x-goog-api-key; MiMo: dual headers + thinking disabled; others: Bearer). API keys are stored in
  **per-provider slots** (`llm_api_key:<provider>`, mimo maps to the legacy slot) so switching providers never
  wipes another provider's credential. UI: base URL editable for every provider (+ restore default), model
  preset chips, per-provider key status/format/get-key link, provider quirk note, test button.
- **Reasoning:** the old page had one key slot and one request shape — switching provider silently kept the
  wrong key and sent wrong headers (Claude/Gemini would 401). Fixed `writeLlmSettings` whole-file overwrite
  (was clobbering `local_user_id`) via merge writes.
- **Alternatives:** one key + clear-on-switch (rejected — hostile to multi-provider users); a provider SDK per
  vendor (rejected — all targets are OpenAI-compatible endpoints; header/body deltas suffice).
- **Status:** `DECIDED` — 2026-11-21, executed. Verified: tsc=0, vitest 127/127 (+7), build passed, live API
  round-trip (claude slot isolated from real mimo key `tp-c…2qm6`, unknown provider → 400, LLM check replied OK).

## D-085 — Start composer dropdowns: real provider/model switching (DECIDED)

- **Decision:** Replaced the Start-page composer's fake dropdowns with real ones. The provider menu now lists
  all 10 providers from the shared registry with brand icons, an active ✓ and an honest "无密钥" hint per
  provider (new `key_status` map on `GET /api/llm/config`); picking one really switches the effective LLM
  config (provider + default endpoint + first preset) through the same PATCH the Settings page uses. The model
  menu lists the current provider's presets (plus the configured model if off-list) and really switches the
  model. Submit payload now carries the real provider id (was hardcoded "Local").
- **Reasoning:** both menus were dead UI (provider fixed at "Local" with one inert option; model options were
  hardcoded and clicking did nothing) — exactly the "every button must be real" standard from BUTTON audit D-080.
- **Alternatives:** a per-query model picker with separate configs (rejected — GSC has one effective LLM config;
  the composer drives it); navigating to Settings instead of switching (rejected — two clicks for a common task).
- **Status:** `DECIDED` — 2026-11-21, executed. Verified: tsc=0, vitest 127/127, live model switch + restore
  (key untouched), screenshots `menu-provider.png` / `menu-model.png`.

## D-086 — P2 batch: OpenAPI, LLM cost accounting, MCP prompts/resources, N+1 fix, semantic layouts, primer, quick reuse (DECIDED)

- **Decision:** Executed seven P2 items in one batch. (1) `server/openapi.ts` derives an OpenAPI 3.1 doc from
  `KNOWN_ROUTES` (the route registry is the single source of truth) served at `/api/openapi.json` + a
  self-contained `/api/docs` page. (2) LLM cost accounting: `Counter.snapshot()` + per-provider USD price
  table (explicitly labelled estimates) + `GET /api/llm/usage` + usage line in Settings→Model. (3) MCP
  prompts (summarize_item, review_proposals with argument interpolation) and resources (gsc://profile,
  gsc://proposals/pending). (4) N+1 fix: `itemOwners` batch + `sharedItemIds` replaces per-row owner/share
  lookups in `visibleItemIds` (visibility semantics proven unchanged via sharing/authz tests). (5) §4.3
  semantic field ordering + type-aware block titles (主张/方法/决策内容). (6) GAP-08 concept primer inside
  `EmptyState` (4 concept cards). (7) GAP-13 "add to context" quick action on both detail pages.
- **Reasoning:** execution of `REMAINING_WORK.md` v3 in sequence; spec-from-registry prevents doc drift;
  price table is one file to edit when vendors change; batch owner resolution preserves exact semantics.
- **Alternatives:** static hand-written OpenAPI file (rejected — drifts from routes); billing-grade cost
  tracking (rejected — estimates labelled, GSC bills nothing); per-page bespoke primers (rejected — one
  component covers all empty states).
- **Status:** `DECIDED` — 2026-11-21, executed. Verified: tsc=0, lint=0, vitest 135/135 (26 files, +5),
  live `/api/openapi.json` `/api/docs` `/api/llm/usage` all 200. Remaining P2: skeletons (GAP-09), bulk
  tagging (GAP-10); OAuth blocked on external credentials.

## D-087 — GAP-09 skeletons + GAP-10 bulk tagging (DECIDED)

- **Decision:** Closed the last two P2 items. (1) `SkeletonRows` shimmer loading rows (reduced-motion aware)
  shown in Raw/Object lists during the initial data load (`loadingItems` state). (2) Bulk tagging: a「选择」
  toggle in list toolbars switches rows into pick mode (✓ mark + highlight, no nested interactive elements);
  a bulk bar (dimension select + value input) assigns one tag value to every picked item via per-item
  `createTagValue` — safe because `tag_values_unique` includes `COALESCE(item_id,'')`.
- **Reasoning:** completes GAP-09/10; selection-as-mode avoids checkboxes inside row buttons (a11y);
  skeleton hides the empty-state flash before first paint.
- **Status:** `DECIDED` — 2026-11-21, executed. Verified: tsc=0, lint=0, vitest 135/135, screenshot
  `bulk-tag.png` (select mode + bulk bar). P1/P2 now fully cleared except external OAuth credentials.

## D-088 — Phase 07: Malleable multi-view workbench execution plan (PROPOSED)

- **Decision:** Plan (not yet execute) Phase 07 per founder decision 2026-11-22 (GSC multi-view,
  Ream feel + Huabu feel): V1 engagement traces (dual-color activity bars) → V2 multi-projection
  views (list/reader/relations/timeline/spatial) → V3 edit-level attribution + inline proposals →
  V4 spatial workbench (selection-as-context, delegate, results as proposal cards) → V5 Scenario A
  closed-loop verification. Full task cards in `PHASE_07_PLAN.md`.
- **Reasoning:** implements the decided view direction with vertical slices; preserves D-042
  (machine = proposal) and the view-is-projection discipline (D-079 precedent); defers process
  model (Q-D) and cross-project sharing (Q-F).
- **Alternatives:** build spatial first (rejected — traces layer is the shared data foundation);
  big-bang view engine (rejected — violates no-unnecessary-abstraction discipline).
- **Consequences:** events gain actor/action; new projections are computed views only; V4 gated
  on Q-E tier decision (proposed: scratch/kept).
- **Status:** `PROPOSED` — awaiting founder confirmation of Q-E tiers, sequence, and milestone
  acceptance mode.

## D-089 — Registration receipt demo: self-written ReceiptPrinter (DECIDED)

- **Decision:** The create-account flow ends with a thermal-printer「注册收据」(name/email/identity/
  time/order + barcode; drag the receipt up to tear off, or Continue → workspace). The ReceiptPrinter
  component is **self-written** (`src/components/ReceiptPrinter.tsx` + `receipt.module.css`, React +
  CSS Modules, zero new dependencies) per user 2026-11-22「不要API Key，你自己写效果」. The React Bits
  Pro registry install path (components.json registries + `REACTBITS_LICENSE_KEY` + shadcn CLI) was
  configured per the original request, then **reverted** on that instruction — no license key, no
  registry config, no alias plumbing, no Tailwind anywhere.
- **Reasoning:** the effect (feed animation, tearable receipt with flick, zigzag tear edge, barcode,
  LED, reduced-motion) fits in two files without a key-gated paid dependency; D-005 stack (CSS
  Modules + own tokens) stays intact.
- **Alternatives:** React Bits Pro `receipt-printer-css` via shadcn CLI (blocked — no
  REACTBITS_LICENSE_KEY exists on the machine; user declined the key path); Tailwind + shadcn init
  (rejected — D-005 rejected Tailwind + UI kit); free React Bits library (has no receipt printer).
- **Consequences:** the receipt is a demo artifact only (no billing/invoice semantics — task card
  `RECEIPT_DEMO_PLAN.md`); sign-in and CHORD OAuth paths unchanged (`onAuthed` contract untouched).
  Gotcha recorded: sheet children containing in-flow text need `position: relative; z-index: 1` to
  paint above the sheet's opaque paper-SVG frame (the rule `.grip`/`.form` already follow) — the
  hint text was invisible until applied. If the official component is ever wanted: re-add the
  registries to `components.json`, put the key in `.env.local`, then
  `npx shadcn@latest add @reactbits-starter/receipt-printer-css`.
- **Status:** `DECIDED` — 2026-11-22, executed. Verified: e2e screenshots `receipt-1-signin.png`…
  `receipt-4-continued.png` (register → receipt printed → Continue → workspace + onboarding;
  `scripts/shot-receipt.mjs`, 1440×900, step assertions included); task files tsc/lint clean —
  repo-wide tsc at handoff shows only the concurrent D-088 V1 workstream's in-flight `activity`
  prop errors in `src/app/App.tsx`, and `npm run lint`'s only error is that workstream's untracked
  `scripts/shot-fig.mjs`; vitest 134/135 (1 timeout in `server/intel/intel.test.ts`, no import
  relation to this change); full build green at 20:2x before the concurrent edit landed.

## D-089 — Phase 07 V1 engagement traces: executed (DECIDED)

- **Decision:** Execute V1 per D-088 (user confirmed 开始执行 2026-11-22). Result: dual-color
  activity bars (blue=user, orange=agent) on list rows + detail footprint line, backed by
  events actor/action traces (opened throttled 10min per viewer+item, updated with changed-keys
  detail, proposed actor=agent on proposal targets).
- **Execution findings (deviations from plan, all documented):**
  1. No migration needed — `events.actor/action` columns already existed (plan assumed a new
     0014 migration; schema verified first, dropped the migration).
  2. Repo-level items.ts already wrote created/updated events; a router-level PATCH event was
     removed as double-counting; field-level changed_keys (`fields.<key>`) enriched at the repo
     source instead.
  3. `api.listItems` aggregated paged responses and silently dropped new `activity` field —
     fixed at the aggregation point (client bug caught by DOM probe, not tests).
  4. Proposals are machine-only by contract (PROPOSAL_SOURCES = agent|detector) → trace actor
     is always 'agent'.
- **Test hardening:** `server/intel/intel.test.ts` now stubs `node:dns/promises` lookup — the
  capture journey no longer depends on live DNS (sandbox-safe; pre-existing flake surfaced when
  DNS went down mid-session).
- **Operational incident (recorded in KNOWN_ISSUES):** local user binding (`local_user_id`)
  hijacked visibility after historical hint-check scripts created a fresh user; deleted the
  orphan user to restore binding-free default visibility.
- **Status:** `DECIDED` — 2026-11-22, executed. Verified: tsc=0, lint=0, vitest 136/136 (+
  engagement), DOM probe 174 bars, screenshots `v1-activity-bars.png` / `v1-footprint.png`.

## D-090 — Phase 07 V2 multi-projection views: executed (DECIDED)

- **Decision:** Execute V2 per PHASE_07_V2_PLAN.md (user confirmed 2026-11-23). Result: ViewMode
  widened to list/grid/relations/timeline/spatial(placeholder); ViewSwitcher in raw/objects toolbars;
  TimelineView (date-grouped event stream, V1 dual-color actor dots) and RelationsView (deterministic
  layered SVG — explicitly NOT a graph DB / NOT force-directed) as read-only projections over the
  current filtered rows; batched read-only endpoints GET /api/events + GET /api/relations (both
  visibility-scoped, both-ends filter on edges); saved views (named filter+view recipes) in
  localStorage only.
- **Drift fixed during work:** bare POST /api/relations was missing from KNOWN_ROUTES (registered
  now along with the new GET routes — openapi doc stays truthful).
- **Zero-copy discipline verified live:** CDP fetch-spy probe (`scripts/probe-views.mjs`) switched
  all projections 10× — 0 mutating requests. Building edges stays on the proposal path (dashed edge
  = pending association proposal).
- **Test hardening:** `server/views-projections.test.ts` — events stream visibility scoping + both-ends
  edge visibility across owners.
- **Status:** `DECIDED` — 2026-11-23, executed. Verified: tsc=0, lint=0, vitest 138/138 (28 files),
  zero-copy probe PASS, screenshots `v2-relations.png` / `v2-timeline.png`.

## D-091 — Phase 07 V3 attribution & inline proposals: executed (DECIDED)

- **Decision:** Execute V3 per PHASE_07_V3_PLAN.md (user confirmed 2026-11-23, three defaults
  accepted). Result: (1) edit-level attribution — `updateItem` takes optional `{actor, via}`;
  accepted proposals apply as actor=agent with `| via proposal <id>` in the event detail;
  association proposals create relations with created_by=agent. (2) `computeAttribution(events)`
  pure function (shared server/V5): edit counts + per-field last editor. (3) Detail page:
  attribution strip (green you / purple agent / amber pending-proposal chips), per-field owner
  dots, inline proposal rows with 采纳/拒绝/暂缓 (defer = local dismiss, stays pending — schema
  vocabulary is accepted|rejected only).
- **Attribution semantics (confirmed):** a change applied via an accepted proposal is recorded
  as agent-originated; the human confirmation shows up in the proposal's own status transition —
  consistent with D-042 (machine products stay machine-labelled even after confirmation).
- **Status:** `DECIDED` — 2026-11-23, executed. Verified: tsc=0, lint=0, vitest 140/140
  (29 files, +2 attribution tests), live attribution payload + 3 pending proposal rows on
  detail page, screenshot `v3-attribution.png`.

## D-092 — UI/backend optimization plan: defaults taken + batch A executed (DECIDED)

- **Decision:** Execute `UI_BACKEND_OPTIMIZATION_PLAN.md` batches A→B→C (user "开始执行"
  2026-11-23). Three plan defaults taken and decided here: (1) this plan runs before Phase 07
  V4 — V4 is blocked on the Q-E archive-tier decision anyway; (2) hide-vs-forbid = **404 hide
  existence** for unauthorized reads (consistent with `restoreItem`'s `not_found`; alternative
  403 rejected — it leaks existence and enables probing in shared mode; `PATCH item`'s current
  `contract` leak gets fixed in B2); (3) soft-delete stays items-only for now — expanding
  `deleted_at` to contexts/clusters/sources/tags is `DEFERRED` (the `notDeleted()` predicate
  seam in `server/repo/items.ts` is the single source to copy when it happens).
- **Batch A executed (U4 + B3):**
  - U4 flaky root cause found: `sharing`/`attribution`/`engagement` integration tests boot a
    real PGlite + migrations inside one `it()` and exceeded vitest's default 5s timeout under
    parallel worker contention (reproduced: 4 failed at ~5.02–5.08s). Fix: `testTimeout: 20_000`
    in `vitest.config.ts`. Drift vs plan text: the plan guessed "fake clock / throttle windows";
    the tests are deterministic, the timeout was the lie.
  - B3: `updateItem` now wraps items + content + events in `db.transaction` (its comment claimed
    atomicity since O1-4; the code never did). Soft-delete read predicate single-sourced as
    `notDeleted()` (was 5 hand-written `isNull(items.deleted_at)`).
  - The O1-4 acceptance "injected failure → no orphan rows" was never actually tested (execution
    record only noted "67 tests pass") — now written: `server/repo/items.test.ts` injects a
    failing `events` insert through a proxy Database and proves createItem leaves no orphans and
    updateItem leaves no half-update (title/content unchanged, no phantom event).
- **Status:** `DECIDED` — 2026-11-23, batch A verified. tsc=0, eslint=0, vitest 142/142
  (30 files, +2 injection tests) × 3 consecutive rounds green.

## D-093 — B1 route pipeline + B2 authz decision point: executed (DECIDED)

- **Decision:** Execute batch B of `UI_BACKEND_OPTIMIZATION_PLAN.md`. (1) B1: `server/pipeline.ts`
  dispatch table (`ROUTES` in `router.ts`); KNOWN_ROUTES is now *derived* from the handler table
  (route-manifest drift structurally impossible); body/validation/idempotency configured per method;
  idempotent-write extended from 3 endpoints to all write endpoints except the documented
  run-action exceptions (`sources/:id/sync`, `llm/check` — re-running should re-run, not replay).
  (2) B2: `server/authz.ts` single decision point; D-092 policy landed — invisible → 404,
  visible-but-not-permitted → 403 (was scattered 400 'contract'); list-level owner filtering for
  GET /api/contexts | /api/clusters | /api/sources (fixes the list-IDOR where any valid token saw
  every row); items pagination now scoped in SQL so `total`/`next_cursor` only describe visible rows.
- **Drift found and removed during work:** `POST|DELETE /api/items/:id/relations` was declared in
  KNOWN_ROUTES and documented in openapi META but had **no handler** (every call fell to 405) —
  a phantom route. Removed from the manifest and META; relation creation remains
  `POST /api/relations` (the only endpoint the client ever used).
- **Alternatives rejected:** keeping the if-chain and just extracting helpers (drift surface stays);
  blanket-404 for role denials on visible clusters (share holders would lose honest feedback).
- **Status:** `DECIDED` — 2026-11-23, executed. Verified: tsc=0, eslint=0, vitest 149/149
  (31 files, +7 pipeline/authz tests), `api-checks.mjs` 12/12. sharing.test.ts assertions updated
  400→403 per the policy change (recorded here so the diff reads as intentional).

## D-094 — U1 client data layer + U3 field vocabulary: executed; U2 deferred (DECIDED)

- **Decision:** Execute batch C of `UI_BACKEND_OPTIMIZATION_PLAN.md`. U1 and U3 landed (commit
  `79fb666`); **U2 (collections.tsx 300-line merge + filters into URL) is `DEFERRED`** because a
  parallel working session is actively writing Phase 07 V4 (spatial view) into the same working
  tree — `collections.tsx` is in its live edit set. Two snapshot-writebacks already hit `App.tsx`
  during this batch (import block reverted once, re-applied). Per AGENTS.md change discipline we
  do not run a wholesale refactor through an actively-shared file; U2 resumes after V4 settles.
- **U1:** `src/services/dataLayer.ts` — invalidation rules table + mutation runner + error-kind →
  i18n key mapping. 25 hand-copied try/catch call sites in App.tsx collapsed onto the runner;
  the rules table pins the stale-badge regression (item.delete must refresh clusters+contexts).
  relationIndex now batched via `listRelationsFor` (was one `getItem` per object item — also
  polluted engagement counts); context/cluster lists carry `member_ids` (repo one batched query,
  kills the detail-fetch fan-out); `opened` trace is explicit (`?trace=1` from the detail-open
  action only) so plain reads and export are side-effect-free; errors are partitioned per
  panel/view scope. Tests prove: one create + reload = 2 requests (≤3), plain getItem writes no
  events, delete rule includes clusters.
- **U3:** `src/lib/itemFields.ts` single-sources the ItemFields vocabulary (replaces 4 drifting
  copies: `repo/items.ts` fieldColumns, `App.tsx` + `detail.tsx` fieldLabels, the multiline set);
  bilingual field labels; all form panel copy moved to `strings.ts` (form.*/confirm.* keys);
  coverage tests make a missing zh/en copy or an out-of-vocabulary template key fail the suite.
- **Alternatives rejected:** doing U2 first and asking V4 to pause (V4 was already mid-flight);
  adding jsdom for orchestration tests (pure runner + fetch stub covers all three U1 acceptance
  items with zero new dependencies — plan-text drift recorded in the plan §6.2).
- **Status:** `DECIDED` — 2026-11-23. Verified: tsc=0, eslint=0, vitest 167/167 (34 files, +17
  new). Working-tree caution: a parallel session writes this repo concurrently; commit `79fb666`
  carries a few of its in-flight V4 lines in api.ts/strings.ts (shared files, noted in the commit
  message).

## D-095 — Phase 07 V4 spatial workbench: executed (DECIDED)

> 编号修正（2026-11-23）：本条目原写 D-092，与上文批次 A 的 D-092 撞号（同一日两个并行会话各自
> 取号）；现顺延为 D-095。THINKING.md / memory 日志中的引用已同步。

- **Decision:** Execute V4 per PHASE_07_V4_PLAN.md (user confirmed 2026-11-23; Q-E default
  adopted: scratch/kept 两档先行, canonical stays on Context/Cluster). Result: SpatialView
  (drag-to-arrange cards, marquee selection = context boundary, explicit delegation via
  agent/propose → naming/classification proposals fall back as purple cards with 采纳/拒绝/暂缓),
  scratch tier in localStorage, kept tier in `spatial_layouts` (per-row coordinates, no JSONB —
  migration 0012) behind GET/PUT /api/spatial-layout (owner-scoped, idem on PUT).
- **Parallel-work reconciliation (recorded for honesty):** parts of the V4 frontend
  (`src/views/spatial.tsx`, api client fns, prefs block, collections wiring) were found
  pre-implemented in the working tree by a parallel workstream (alongside an unrelated U1
  dataLayer refactor, still uncommitted). This run completed the integration gaps: strings,
  CSS, the entire kept-tier server (migration/schema/repo/router), policy fixes (PUT idem,
  invalid eslint directive, unused imports), per-target proposal stacking, tests and
  acceptance verification. No parallel work was reverted.
- **Proposal semantics (per plan):** delegation results are naming/classification proposals
  (existing proposer capability); `classification` resolves as review-marked only (no auto-apply
  — matches resolveProposalApplying contract, stated honestly in UI/plan).
- **Status:** `DECIDED` — 2026-11-23, executed. Verified: tsc=0, lint=0, vitest 167/167
  (34 files, +spatial.test.ts), zero-copy probe PASS incl. spatial (12 switches, 0 writes),
  acceptance shot `v4-spatial.png` (20-card marquee selection + context bar + proposal cards).

## D-096 — Backend optimization plan: defaults taken + batch A executed (DECIDED)

- **Decision:** Execute `BACKEND_OPTIMIZATION_PLAN.md` (user "开始执行" 2026-11-23). Three plan
  defaults taken here: (1) deployment form = Docker self-hosted PostgreSQL per D-004 — the
  adapter is DSN-driven so a managed DB connects the same way; Supabase not selected (no cloud
  dependency, DESIGN_BOUNDARIES); (2) error format stays `{ok:false,kind,message}` — RFC 7807
  `type` URIs are DEFERRED (zero client churn; the error catalog lands in API_CONTRACT instead);
  (3) SLO defaults for a local single-node tool: availability 99.5%, read p95 ≤ 500ms,
  write p95 ≤ 800ms — revisable on user input.
- **Batch A executed:** DB-1 postgres adapter seam (`DatabaseHandle` unified over PGlite and
  node-postgres, exec shape kept `[{rows}]`), DB-2 `schema_migrations` version table (startup
  applies pending files only; legacy DBs stamped without replay), SEC-2 `GSC_ENV=production`
  refuses `GSC_INGEST_ALLOW_PRIVATE` at startup. postgres acceptance is **pending** a reachable
  server — stub-tested only, gated behind `GSC_PG_DSN` (no Docker daemon here, D-026 lineage).
- **Concurrency note:** the parallel V5 session commits the shared working tree continuously and
  swept the batch A implementation into its own commits mid-flight (2eeddb9 client seam,
  bf73a90 migrate runner, f2a9768 config, 4783320 bootstrap, 55201f7 migration 0013,
  53a4018 adapter tests, 264bdcb versioning tests; .env.example left in 5d8b2b7 whose message
  records the scatter). Per-file `git log` verified every piece is in history.
- **Status:** `DECIDED` — 2026-11-23, batch A verified: tsc=0, eslint=0, vitest 176 passed +
  1 skipped (the GSC_PG_DSN acceptance), 10 new tests.

## D-098 — Phase 07 M5 scenario loop: executed; Phase 07 COMPLETE (DECIDED)

> Numbering note (2026-11-23): originally appended as D-093, colliding with the parallel line's
> D-093 (B1/B2); renumbered to D-098.

- **Decision:** Execute V5 per PHASE_07_V5_PLAN.md (user confirmed 2026-11-23, defaults adopted:
  generated materials, real URLs with honest degradation, screenshots). Both scenarios ran the
  full loop 入料→圈定→委派→提案→裁决→归因/溯源 with real API writes; adjudication performed by
  agent on the user's behalf via real resolve calls (disclosed in the report, not faked UI clicks).
- **Results:** Scenario A 20/20 materials ingested (idempotent re-sync verified); Scenario B
  10/10 URLs captured (2 needed manual retry — auto-retry gap recorded). Delegation (real LLM)
  produced 40+40 proposals that fell back into the space; adjudicated 3 accepts (all with
  via-proposal traces), 3 rejects (zero edit traces), 1 defer (stays pending). Attribution
  reconciliation 7/7 PASS (`scripts/verify-attribution.mjs`). Zero-copy probe PASS. Write ledger
  fully accounted (32 ingest + 80 proposals + 6 adjudications, 0 background writes).
- **Findings (P1, recorded for later):** proposal flood (detector metadata noise + per-chunk
  capture naming — up to 12 proposals per target, pending 149→459+); no automatic capture retry;
  classification proposals are review-marked only (by contract).
- **Status:** `DECIDED` — 2026-11-23, executed. Evidence: `PHASE_07_M5_结论.md` +
  m5-a5/a7/b1/b5 screenshots. **Phase 07 COMPLETE** (M1-M5: D-089/090/091, D-095+097 for M4, D-098 for M5).

## D-097 — Batch B baseline + DB-4 evidence-driven rewrite: executed (DECIDED)

- **Decision:** Run batch B of `BACKEND_OPTIMIZATION_PLAN.md` as measurement-first, then let the
  measurements pick the rewrites (database-optimizer discipline: no optimization without a
  baseline, one change at a time, no redundant indexes).
- **Baseline (DB-3 + SRE-2):** `scripts/bench-backend.mjs` (zero new deps) — 7 HTTP workloads +
  8 EXPLAIN (ANALYZE, BUFFERS) shapes + index inventory at N=1k and N=10k
  (`docs/BACKEND_PERF_BASELINE.md`, `docs/BACKEND_PERF_BASELINE_10K.md`). Baseline facts
  recorded: the write token bucket (60/min/key) IS the standing throughput policy (first run
  hit 429 by design); PGlite single-connection serializes concurrent reads.
- **DB-4 executed (two rewrites, one hotspot):** the 10k cliff (list p50 686ms with all SQL ≤20ms)
  localized to `listItemsPaged`: (1) it loaded the ENTIRE `item_content` table into memory per
  request to map page rows (multi-MB at 10k) — now fetches only the page's rows; (2) the `q`
  keyword filter ran in JS *after* pagination (could only match within one page; `total` was a
  lie) — now pushed into SQL over title/source_label/content_text (D-020 semantics). Result:
  10k list p50 686→167ms (-76%), p95 867→190ms (back under the 500ms read SLO); keyword p95
  879→270ms. Index audit verdict: zero changes — the page sort key matches `items_updated_id_idx`
  and all other tables are covered; first EXPLAIN draft had the wrong sort key (created_at vs
  actual updated_at) and was corrected before drawing conclusions.
- **Left open (measured, not fixed):** `/api/search` full-scan p95 752ms @10k exceeds the read
  SLO — deferred to be decided together with P3 semantic search (GAP-14). Non-hotspot workloads
  moved ±10ms from machine load only (parallel session running on the same box).
- **Status:** `DECIDED` — 2026-11-23. Verified: tsc=0, vitest 176 passed + 1 skipped after the
  rewrite (q-semantics tests all green); before/after numbers archived in the baseline reports §4.

## D-098 — Strict re-audit of batch A/B: 1 P0 + 3 P1 found and fixed (DECIDED)

- **Decision:** Re-evaluate D-096/D-097 work under adversarial review (strictest standard:
  every claim re-proven, own tests mutation-checked). Result: the headline perf claim and the
  index verdict stand, but the review found one P0 regression introduced by the DB-4 rewrite and
  three P1 hardening gaps in batch A.
- **F-1 (P0, fixed):** the q pushdown used raw LIKE — `%`/`_` in the query became wildcards
  (`q=100%` matched everything), a semantics regression vs the old substring filter. Fixed with
  backslash escaping; regression test seeds counter-examples ("1000 items list", "a-c probe")
  that an unescaped LIKE matches — **mutation-verified** (escaping removed → test red → restored).
- **F-2 (P1, fixed):** migration apply + version stamp were two execs — a crash between them
  left a file applied but unrecorded and it would replay. Now one exec (simple-query implicit
  transaction). F-6: filename quote-escaped in the stamp SQL.
- **F-3 (P1, fixed):** `pg.Pool` had no 'error' listener — an idle-client error is an unhandled
  event and kills the process. Now logged via server/log.ts.
- **F-4 (P1, fixed, tightens D-096):** the production gate only blocked the private-ingest
  escape hatch — `GSC_ENV=production` without `GSC_AUTH_REQUIRED=1` served an unauthenticated
  API. Now refused at startup too.
- **Correction to D-097:** "q-semantics tests all green" was inaccurate — q had ZERO tests at
  rewrite time (the suite was green, just not because of q coverage). Corrected in the baseline
  report §4 and here; the F-1 group is the first q coverage the filter ever had.
- **Open K items (recorded, not fixed):** F-5 same-pattern full-content loads remain in
  `agent/detector.ts` (batch job) and `listDeletedItems` (trash) — bounded contexts, and
  `search.ts` (the measured SLO gap, with GAP-14). F-7: node-postgres multi-statement exec
  result shape unverified (adapter acceptance checklist). F-8: `db:reset` only removes the
  PGlite dir — meaningless on postgres (adapter acceptance checklist).
- **Status:** `DECIDED` — 2026-11-23. Verified: tsc=0, eslint=0, vitest 178 passed + 1 skipped
  (2 new: F-1 group, F-4 gate). Claims that survived review: 10k list p50 686→167ms (-76%),
  p95 867→190ms (archived before/after), index audit zero-change verdict.

## D-099 — P1 proposal hygiene: executed (DECIDED)

- **Decision:** Execute PROPOSAL_HYGIENE_PLAN.md (user confirmed 2026-11-23, defaults taken:
  collapse duplicates keeping earliest, per target+kind cap=3, bulk-adjudication UI deferred).
- **Root cause fixed:** detector dedupe keys were mismatched (`metadata:id:null` built vs
  `metadata:id:` tested) so the dedupe never hit and every detection run re-proposed — the
  pending flood (149→497) source. Unified one key function; added per target+kind pending cap.
- **Also delivered:** capture-pipeline naming aggregation (12 proposals/target → ≤2, rationale
  rolled up, pure fn unit-tested); capture auto-retry (retryable transport failures requeued with
  exponential backoff via updated_at gate — 0/60/120/180s — hard-fail past 3, retry_count column
  was already there but unread); UI folding (detail: same-kind groups with chevron, 12 rows → 3
  groups; spatial: one card per target with +N expander); batched legacy cleanup
  (`dedupe-proposals.mjs`: 157+97 identical collapsed, 187+157 over-cap trimmed, paced+retried
  to survive rate limiting — first silent-429 pass found and fixed).
- **Status:** `DECIDED` — 2026-11-23, executed. Verified: tsc=0, lint=0, vitest 182+1 skip/183
  (37 files, +4 hygiene tests incl. detector double-run-zero-increment regression), live hygiene
  PASS (497→255 pending, 0 identical duplicates, stacks ≤3), screenshots `p1-detail-folded.png`
  / `p1-spatial-cards.png`.

## D-100 — Founder goals 2026-11-23 accepted as roadmap input (DECIDED)

- **Decision:** Accept the founder's 2026-11-23 notes as DECIDED goals (G1-G6 in
  `GOALS_2026-11-23.md`): component split with living `component-list.md` (highest priority),
  three-client capture loop (opencode/codex/workbuddy → grouped upload → agent block assignment)
  + per-software partial-compatibility plugin matrix in two days, then raw-info zoom levels with
  semantic titles, Meta-tag v1.0 MVP, Information Model v1.0 MVP this week.
- **Constraints honored:** block assignment stays on the proposal path (D-042); plugin matrix
  records structural limits honestly (codex model-call context injection = impossible); per-goal
  execution plans will be `PROPOSED` separately before coding.
- **Status:** `DECIDED` — 2026-11-23 (goals). Deliverables so far: `GOALS_2026-11-23.md` +
  `component-list.md` v1 (management view; technical specs stay in COMPONENT_REGISTRY.md).

## D-101 — Settings › MCP onboarding page: executed (DECIDED)

- **Decision:** Execute `MCP_CONFIG_UI_PLAN.md` (user "开始执行" 2026-11-23). Two plan defaults
  taken: (1) snippet targets = G2 three ends (opencode/codex/workbuddy) + Claude Code (4 total);
  (2) token plaintext follows the T301 one-time precedent — embedded only when just minted,
  otherwise `<GSC_API_TOKEN>` placeholder (secrets are hash-stored and cannot be re-fetched —
  correct behaviour, not a limitation to work around).
- **Batch A (M-1/M-2/M-3):** tool registry single-sourced in `server/mcp/tools.ts` (stdio
  tools/list and HTTP share it); `GET /api/meta/mcp` (read scope) serves server info + connect
  command + env entries + full registry with annotations, no secrets; API_CONTRACT + OpenAPI
  schema registered; contract test pins endpoint==registry (anti-drift).
- **Batch B (U-1…U-4):** `src/lib/mcpSnippets.ts` pure generator (4 targets, JSON/TOML shapes,
  5 unit tests incl. JSON-parse validation); Settings › 连接 gains the MCP card (command,
  repo-root/token inputs, client picker, copy button, 9-tool list from the endpoint); mcp.*
  i18n keys under the zh/en coverage test.
- **Acceptance (real render, not claims):** `scripts/shot-mcp.mjs` CDP probe against the live
  app — card found, snippet well-formed with placeholders, all 9 gsc_* tools listed, zero JS
  errors; screenshot `ui-prototype/shots/mcp-settings.png`. Visual review caught one real wart:
  the snippet's GSC_API_URL took the browser origin (dev = vite port) instead of the API base —
  fixed to prefer the base reported by /api/meta/mcp, re-probed green.
- **Status:** `DECIDED` — 2026-11-23, executed (commits 6422def batch A, 279ae43 batch B).
  Verified: tsc=0, eslint=0, vitest 188 passed + 1 skipped.

## D-101 — LOCAL_SIM cloud-isomorphic collection: executed (DECIDED)

- **Decision:** Execute LOCAL_SIM_PLAN.md v2 (user confirmed 2026-11-23, "完全按照云端的模拟来").
  Result: cloud-isomorphic topology (docker-compose.yml = the deployment file: db=PostgreSQL 16 /
  api / worker, four volumes; D-096 consistent), schedules registry (0013), worker process
  (capture + T402 sync + schedules tick), folder-scan adapter (read-only, hash-incremental),
  web-crawl adapter (SSRF-guarded, polite 2s gap, raw HTML + meta archived to data/crawl),
  `/console` "本地控制台（临时）" page (CRUD/enable/run-now), GSC_WORKERS=off split so api and
  worker are separate processes exactly like the cloud.
- **Verified live (bare mode):** folder run-now {scanned 1, imported 1} → demo-note ingested;
  web run-now {fetched 2, imported 2} → 2 arXiv items + 4 provenance archives in data/crawl;
  console page rendered with both schedules (screenshot `local-console.png`). Unit tests 3/3 +
  full suite 191+1 skip/192 green, lint clean.
- **Open gate:** `docker compose up` bring-up + down/up resilience — blocked on Docker Desktop
  engine (cannot be started from the sandbox; user action required). Compose files are ready.
- **Incident (recorded in KNOWN_ISSUES):** dev PGlite store corrupted by an earlier force-kill
  (stale postmaster.pid + deeper damage); corrupt dir preserved at `.data/pglite.corrupt-20261123`,
  dev DB restarted fresh at `.data/pglite-v2` (pre-17:47 dev data unrecoverable, Nov-20 backups
  exist but stale). Strong motivation for the Docker PG path.
- **Status:** `DECIDED` — 2026-11-23, executed (compose gate pending user-started Docker).

## D-102 — Local dashboard extracted from the GSC app (DECIDED)

- **Decision (founder, 2026-11-23):** the local sim console must NOT live inside the GSC web
  app. It becomes a standalone dashboard: `dashboard/server.mjs` (own port 8790, static page +
  /api proxy to 8788 — one origin, no CORS) + `dashboard/index.html` (self-contained vanilla JS,
  same console surface: schedules CRUD/enable/run-now/delete). The SPA wiring (/console route,
  sidebar entry, LocalConsolePage) is removed. Launcher `start-gsc-dashboard.bat` placed in
  `C:/Users/chkev/Desktop/bats/` (starts API if down → dashboard → opens browser; skips
  anything already listening).
- **Rationale:** the ops surface for the local/cloud-isomorphic rig is infrastructure tooling,
  not product UI — keeping it out of the GSC app keeps the product surface honest.
- **Status:** `DECIDED` — 2026-11-23, executed. Verified: page 200 + proxy returns schedules,
  screenshot `local-dashboard-standalone.png`, tsc=0, bat smoke (both services healthy).

## D-103 — G2 three-client capture loop: executed (DECIDED)

- **Decision:** Execute G2_CAPTURE_LOOP_PLAN.md (user confirmed 2026-11-23 with defaults:
  codex notify-hook auto-push, WorkBuddy as user-level skill, block assignment by content).
  Founder instruction: expand the WorkBuddy channel (easiest to test) — delivered as the full
  `gsc-push` skill with capability table, group conventions, commands, verification checklist.
- **Delivered:** `POST /api/ingest/batch` (group=client×project×session → agent source anchor,
  snapshot-idempotent, Light Up pipeline, then best-effort block-assignment `cluster` proposals);
  `integrations/gsc-push.mjs` shared CLI (incl. `--codex-event` notify-hook entry with rollout
  harvesting); opencode plugin (`session.idle` push); codex config.toml notify integration doc;
  WorkBuddy skill at `~/.workbuddy/skills/gsc-push/`; cluster-accept **merge semantics** (existing
  same-title cluster → join as member, else create — natural extension of D-042); G3 matrix
  completed in component-list.md.
- **Live verification (WorkBuddy channel, the acceptance):** push → `imported=1`, source anchor
  `agent:workbuddy:GSC`; re-push → `imported=0 skipped=1` (idempotent); naming + classification
  proposals land; block-assignment chain confirmed (`block_proposals=1` on a follow-up push).
  Two real bugs caught by the loop and fixed: (1) LLM contract fragility — models sometimes wrap
  the array in an object ("Agent reply is not an array") → tolerate wrapped arrays;
  (2) hallucinated item ids in block assignments violated the proposals FK → unknown-id guard
  in the organizer (+ prompt hardened to copy full ids).
- **Status:** `DECIDED` — 2026-11-23, executed. opencode/codex integration pieces are written
  and installed-ready; their live end-to-end run (real session push) is the remaining acceptance
  item, with the documented risk that codex rollout JSONL is not a stable API.

## D-104 — G2 acceptance run: three channels verified at plumbing level (DECIDED)

- **Scope:** complete the G2 remaining acceptance (opencode/codex live session push).
- **Results (honest grading):**
  - **WorkBuddy — FULL PASS** (earlier, D-103): import/idempotency/grouping/proposals live.
  - **codex — PLUMBING PASS, trigger pending:** the notify slot is occupied by Codex Desktop's
    computer-use hook → installed a chain dispatcher (`notify-dispatcher.mjs`) that forwards to
    the original hook AND pushes to GSC (config backed up, README updated). Synthetic turn-ended
    event proved the full chain with REAL rollout data: `agent:codex:GSC` anchor + harvested
    conversation ingested. Live turn-end trigger unverified: `codex exec` hangs headless in this
    environment (custom cc-switch provider unresponsive to headless runs) — will fire on the
    user's normal desktop turns.
  - **opencode — PLUGIN PASS, run pending:** plugin rewritten to the dual-loader contract the
    installed opencode enforces (V1 wants `server()`, V2 wants `id+setup` — one export serves
    both, verified loading clean in `~/.config/opencode/plugins/`). `opencode run` hangs headless
    in this environment (user's spark-autostart sidecar also fails to load — pre-existing v1
    plugin incompatibility) — session.idle push pending a working session.
- **Environment blockers recorded (KNOWN_ISSUES):** codex headless exec hang; opencode headless
  run hang + broken spark-autostart plugin; opencode v1/v2 dual-loader contract drift.
- **Status:** `DECIDED` — 2026-11-23, executed to the environment's limit. Code + integrations
  complete; both remaining triggers are runtime-environment issues, not integration gaps.

## D-105 — META_TAG_SYSTEM_V1 executed (DECIDED)

- **Decision:** Execute META_TAG_V1_PLAN.md (design META_TAG_SYSTEM_V1.md PROPOSED, founder
  notes 2026-11-24; four design confirmations taken as recommended).
- **Delivered:** 0014 migration (meta_groups with 4 seeded groups incl. visibility_default as a
  cloud-domain hint; meta_tag_groups multi-parent edges; assignment_params + item_meta_params
  typed params, no JSONB; idempotent tagging index) · repo/tags.ts extensions (groups, setTagGroups,
  params, filterItemIds intersection) · routes (GET /api/meta/groups, PUT /api/items/:id/meta-params,
  meta filters merged into GET /api/items: ?group=&tag=&param.k=v) · meta_tag proposal accept →
  confirmed assignment (D-066: accept IS user confirmation) · suggestMetaTags (from existing
  definitions only, hallucinated-id guarded) wired into processSnapshot · UI: settings tag form
  with group multi-select + collection group filter chips.
- **Key schema correction during execution:** `proposals.related_id` is an items FK — a tag
  definition id cannot live there. Added `proposals.related_definition_id` column instead
  (0014 ALTER IF NOT EXISTS).
- **Verification:** vitest 4/4 meta tests (seed/multi-parent/idempotent+params/filter intersections/
  accept→confirmed) + full suite 198+1skip/199 · live manual loop on :8792 (create multi-parent
  tag → assign with evidence param → set importance=5 → group/param filters incl. intersection)
  · UI screenshot meta-filter-chips.png (chips + item render).
- **Status:** `DECIDED` — 2026-11-24, executed.

## D-106 — pending_definition proposal flow: executed (DECIDED, G5 收尾)

- **Decision:** Execute the pending_definition flow (founder 2026-11-24). Contract:
  `suggestMetaTags` replies `new_tags` for invented tags → one `pending_definition` proposal per
  name (deduped on pending) + a `meta_tag` proposal carrying `related_definition_id = new:<name>`
  and the assignment value. Accepting `pending_definition` creates the tag definition (by name,
  idempotent) and upgrades every pending `new:<name>` meta_tag ref to the real definition id;
  the meta_tag accept then lands the confirmed assignment (D-066).
- **Design flaw caught by the test and fixed:** accepting a meta_tag whose ref is still `new:`
  CONSUMED the proposal (status=accepted) while skipping the assignment — the later upgrade could
  never match it. Now such an accept leaves the proposal PENDING with a `blocked: definition
  pending` event trace, so it can be accepted for real after the definition lands.
- **Verified:** 6/6 meta tests (new_tags parse; three-beat flow: blocked-early-accept → definition
  created + ref upgraded → assignment lands confirmed) + full suite green + lint clean.
- **Status:** `DECIDED` — 2026-11-24, executed. G5 (Meta-tag v1.0 MVP) now complete including the
  pending_definition face; meta_tag/pending_definition proposal cards labelled in detail view.

## D-107 — Semantic title pipeline (G4 front half): executed (DECIDED)

- **Decision:** Execute `SEMANTIC_TITLE_PLAN.md` (user confirmed 2026-11-24; the three plan
  defaults adopted: 4 levels + short-doc adaptive, on-demand generation without a queue, display
  batch delivered together). Titles are event-style semantic summaries proposed per sibling group
  (parent + confirmed titles as context = consistency) and land only via the proposal gate;
  user renames are direct and never overwritten (nameOrigin: rule → agent → user).
- **Batch A:** `outline_nodes` model (0015: node path/level/offsets/title/name_origin/text_head;
  `proposals.target_path` for node-scoped semantic_name proposals — target_id stays the item,
  items FK preserved per the G5 related_definition_id precedent). Pure derivation in
  `src/lib/outline.ts` (heading mode ≥2 headings clamped 1–4; prose mode ≤5 paragraphs one level,
  longer = ≤5 L1 groups + L2 paragraphs; heading-only paragraphs merge into their span).
  Agent titles are text-bound (slice head changed → back to rule, re-generatable); vanished
  paths drop.
- **Batch B:** `server/agent/titler.ts` (one LLM call per sibling group; duplicate-title clusters
  regenerate ONCE, still-duplicates stay rule/"待改"); `POST .../outline/ensure-titles` creates
  pending semantic_name proposals idempotently (no re-proposal while pending); accept lands on
  the node via resolveProposalApplying; /outline/ paths carry the agent rate class.
- **Batch C:** OutlinePanel in raw detail (indent/collapse/三态徽标/on-demand generate);
  GET outline derives at display time and returns pending_paths.
- **Acceptance (four-state CDP probe):** 3 rule titles → generate → 3× 提案中 → accept one →
  「本周完成设计已确认」; 0 JS errors; `ui-prototype/shots/outline.png`. Real bugs found by
  doing: fresh items hid the panel entirely (empty outline ⇒ no generate button — GET now
  derives), pending_paths omitted just-created proposals (badges never flipped), duplicate
  clusters only regenerated the second member (first comer was ambiguous too).
- **Status:** `DECIDED` — 2026-11-24, executed (5e471ff/4d0dbb8/a931190/218fa6d). Verified:
  tsc=0, eslint=0, vitest 214 passed + 1 skipped (+15 new: derivation 5, repo 5, titler 4,
  wiring 1). Sibling work: full G4 zoom interaction (gestures/远景列表) remains its own track —
  shares outline_nodes, does not rebuild.

## D-108 — G2 integrations management surface: executed (DECIDED)

- **Decision (founder 2026-11-24):** the three-client capture loop needs a management place —
  download / config / link test — placed in the GSC product UI settings › 连接 (founder chose B),
  with token generate + revoke (already present in TokenSection).
- **Delivered:** `IntegrationsSection` in settings › 连接 (4 cards: opencode / codex / WorkBuddy /
  manual — each with download buttons, copy-install-command, per-client connection lamp
  (`agent:<client>:*` anchor + last snapshot activity), and a Test link button that pushes a tiny
  self-test doc through the REAL ingest path) · API: GET /api/integrations/files/:name (allowlisted
  JSON+base64 downloads), GET /api/integrations/status, POST /api/integrations/test · ingest core
  extracted to `server/intel/batch.ts` (shared by /api/ingest/batch and the test probe) ·
  integrations/workbuddy/SKILL.md mirror in-repo for download · settings deep link
  `/settings?section=connections`.
- **Implementation notes:** route contract is JSON-only → downloads ship base64 + frontend Blob;
  file resolution has a cwd fallback (vitest rewrites import.meta.url — caught by the test).
- **Verified:** server/integrations.test.ts 1/1 (allowlist/404/status/test-push/anchor lamp) +
  ingest 3/3, live endpoints on :8792 (status/download decodes/test imported=1), UI screenshot
  integrations-panel.png, tsc=0 lint=0.
- **Status:** `DECIDED` — 2026-11-24, executed.

## D-108 — Login page redesign: tech-minimal, both layout variants shipped (DECIDED)

- **Decision (2026-11-25):** LOGIN_REDESIGN_PLAN executed with BOTH shells — centered card
  (default, OpenAI-style) and split brand+form (`?layout=split`, founder asked for the split as
  an alternative to compare). Hand-drawn sketch elements (SketchFrame/SketchUnderline/paper
  grip/ReceiptPrinter) retire from the LOGIN surface only; the in-app sketchbook language is
  untouched. Registration receipt becomes a minimal receipt card (plan default ①). Wordmark is
  pure type + geometric dot (plan default ③).
- **Implementation:** shared form block, two shells, scoped design tokens (light + dark via
  [data-theme]), 120–180ms micro-interactions. Identity logic unchanged (zero logic edits).
  `?layout=split` is captured at MODULE load — the app router normalizes the URL on boot and
  strips unknown query params (found via the acceptance run).
- **Acceptance:** CDP shots ×4 (card/split × light/dark) + form-flow probe (empty submit →
  validation error) + zero sketch elements probe. `ui-prototype/shots/login-*.png`.
- **Status:** `DECIDED` — 2026-11-25. Verified: tsc=0, eslint=0, vitest green (exit 0).

## D-109 — Connections page visual overhaul: tech-minimal console (DECIDED)

- **Decision (2026-11-25):** CONNECTIONS_VISUAL_PLAN executed (user: "现在这个视觉风格太难看了"
  → rebuild, not polish). Both plan defaults taken: tool surface as chip rows (mono name chip +
  read/write badge + one-line description, hover expands), client picker as 4 tabs.
- **Layout:** two-column console — left: token cards + MCP config/snippet; right: tool surface
  (9 chips); integrations (G2 three-end) restyled full-width below. Duplicate CLAUDE CODE/CODEX
  hint block removed. All visuals use app tokens (light/dark automatic), matching the new
  login language (10px radius, chips, micro-interactions).
- **Acceptance:** CDP probe (4 tabs / 9 tool chips / 4 token cards / 4 integration rows /
  snippet+placeholder / 0 JS errors) + visual review (two fixes landed from it: MCP card title
  shortened out of uppercase-shout, tool descriptions get native tooltips).
- **Status:** `DECIDED` — 2026-11-25. Verified: tsc=0, eslint=0, vitest 215 passed + 1 skipped.

## D-109 — SIDEBAR_PLAN executed (DECIDED, 先于 G7)

- **Decision (founder 2026-11-25「先执行 sidebar plan」):** deliver the sidebar update first.
  G7's conversations data layer (migration 0015 conversations/messages skeleton) pulled forward
  as the plan's own step-2 dependency.
- **Delivered:** 置顶 section (spatial pinned pages data face, chevron collapse persisted in
  UiPrefs) · 对话「最近」section (ConversationList from GET /api/conversations, rows →
  #chat/:id placeholder view) · two-「最近」semantics live (top = information timeline,
  bottom = conversation timeline, never merged) · routes /chat/:id · conversations/messages
  schema + repo/chat.ts + 3 routes.
- **Deferred to G7:** awaiting_user 黄点（needs tasks/stages) · real ChatView (placeholder notes
  G7 V1) · 置顶动作（pin action; only the data face ships now).
- **Verified:** conversations.test 1/1 (CRUD+routes round-trip) · UI screenshot
  sidebar-two-recents.png (both sections + seeded conversations) · tsc=0 lint=0.
- **Status:** `DECIDED` — 2026-11-25, executed.

## D-110 — 边界演进：GSC 对话工作面划入 GSC（DECIDED）

- **Decision（创始人 2026-11-25 两图批注 + GSC_CHAT_DESIGN.md v2 §1）**：「完整会话 UI 归
  Thylas」（11-23）演进为——**信息工作对话与任务编排**（消息块流、任务卡/管线、DSL 交互面、
  对话列表）划入 GSC；Thylas 保留通用会话与展示（Overview/Workspaces/Coworkers/presentation）。
- **理由**：任务卡/管线/DSL 全以 GSC 信息对象（Chunk/Cluster/提案/管线）为语义底座，是
  「围绕信息空间干活的入口」的自然延伸；通用会话/展示仍归 Thylas。
- **Consequences**：DESIGN_BOUNDARIES conversations 行已拆分（GSC 行新增）；G7（GSC 对话）
  立项执行（GSC_CHAT_PLAN.md v2 技术版）。
- **Status**: `DECIDED` — 2026-11-25，随 GSC_CHAT_PLAN Step 0 落账。

## D-111 — 薄编排器（DECIDED：不搭 agent framework）

- **Decision（创始人 2026-11-25 问「是否搭建 agent framework」，两轮讨论结论）**：不搭
  agent framework；搭「LLM 任务层 + 薄编排器」，留 bounded tool-loop 插座（StageExecutor
  接口，V1 不实现）。
- **理由**：原型 UX 契约=「先展示要执行的操作，可改，确认后写」→ 执行必须计划内，与涌现式
  agent（think-act-observe）形状相反；原型需求全部落在工作流形状上（计划生成/状态机/停点/
  PATCH/DSL 生成）；框架价值区间（开放工具循环/自主重规划/多 agent）零命中，且黑箱调试违背
  「操作可见可审计」。可证伪触发器（出现任一则重议）：30 分钟级自愈任务 / 不可预测动态编排 /
  第二种完全不同形状的 agent 任务。
- **落地**（Step 3，随本决策执行）：`agent/structured.ts`（structuredCall：结构化输出+修复
  重试+回退）· `agent/uispec.ts`（DSL 生成+模板兜底）· `agent/orchestrator.ts`（runStages：
  四执行语义编排既有引擎、重试≤3、confirm 停 awaiting_user、resumeTask 恢复续跑、
  StageExecutor 插座）。
- **执行期实证**：chatComplete 内建重试吸收瞬时 LLM 错（stage 之下自愈）——stage 级重试只
  针对引擎/解析失败；compose 有模板兜底不红标。
- **Status**：`DECIDED` — 2026-11-25。

## D-112 — V2 收口 + 运行器失败语义（DECIDED）

- **Decision（Step 8 §0 场景端到端驱动）**：增强段失败**不阻塞**后续段——synthesize（提案增强）
  失败红标后管线继续推进（compose/confirm 照跑）；任务终态=有失败段则 failed（可见），
  否则 done。理由：§0 场景「先弄 onboarding」是用户主诉求，提案生成是增强；一次 LLM 抽风
  不应卡死 onboarding。
- **实证**：E2E 中 synthesize 因 **LLM 401 Invalid API Key**（环境 key 失效）三连败——新语义下
  管线穿到 Onboarding，Drawer complete 落 1 条 metadata 提案，PATCH 段续跑至 done。
- **Consequences**：runStages 仅 awaiting_user 停点返回；failed 只标记不中断。
- **Status**：`DECIDED` — 2026-11-25，随 Step 8 执行。

## D-113 — G7「GSC 对话」总账（DECIDED，V1+V2+V3 完成）

- **Scope**：GSC_CHAT_PLAN.md v2 十步三阶段全执行（Step 0–10），设计=GSC_CHAT_DESIGN.md v2。
- **交付**：数据层 0015/0016（conversations/messages/message_blocks/tasks/task_stages/
  uiflows/task_patches/task_events）· 仓储（PATCH 算子 op_hash 幂等/状态机转移表白名单）·
  薄编排器（structuredCall+uispec+orchestrator，D-111/D-112 语义）· API 8 路由（409/422/404）·
  ChatView/TaskCard/FlowPanel（消息块五类/任务卡管线/右侧 Drawer/卡内 PATCH）·
  DSL 解析器（四道校验+降级链+round-trip）· 双时间线（黄点/reference/播报四类）。
- **验收轨迹**：每步 vitest+真链（E2E §0 场景含 Drawer→提案落地+续跑）+ 四图（gsc-chat-v1/
  v2-drawer/e2e-final/sidebar-awaiting-dot）；最终全量 237+1skip/238。
- **决策链**：D-110 边界演进 · D-111 不搭 framework · D-112 失败不阻塞 · 提案载体域分
  （task_patches，FK 约束所致）。
- **遗留**：环境 LLM key 401 失效待换 · Composer 全量接入后置 · WS/流式后置 ·
  卡内 PATCH kind 启发式固定 compose · bounded tool-loop 仅插座。
- **Status**：`DECIDED` — 2026-11-25，G7 V1+V2+V3 完成。
