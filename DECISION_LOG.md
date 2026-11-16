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
