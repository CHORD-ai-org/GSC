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
