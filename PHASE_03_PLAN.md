# PHASE_03_PLAN.md — Execution Plan

Status: `PROPOSED` — 2026-11-18. Awaiting approval. No implementation code has been written.

## 1. Goal and exit criteria

Goal: smallest independently functional GSC. One vertical slice first, then widen.

Exit criteria:

1. `npm run check`, `npm test`, `npm run build` pass.
2. Docker PostgreSQL running; migrations applied; data survives container restart.
3. API returns contract-shaped errors and data.
4. Vertical slice works end to end: create raw item → create Concept with source → reopen detail.
5. CRUD, relations, provenance, browse/filter, history are inspectable in UI.
6. `IMPLEMENTATION_STATUS.md`, `DECISION_LOG.md`, `KNOWN_ISSUES.md` updated; handoff report delivered.

## 2. Proposed technical decisions

All four are `PROPOSED`. Do not implement them as `DECIDED` before approval.

| Id | Topic | Proposal |
|---|---|---|
| D-022 | Physical schema | 4 tables: `items`, `item_content`, `relations`, `events`. Typed nullable columns, no JSONB payload. |
| D-023 | API contract | `GET/POST /api/items`, `GET/PATCH /api/items/:id`, `POST /api/relations`. Shared modules `src/lib/{items,relations,events,api}.ts`. |
| D-024 | Local DB | Docker container `gsc-postgres`, host port `55433`, db/user `gsc`, password `dev`. `DATABASE_URL` in `.env.local`. |
| D-025 | Test scope | contract unit tests + repo round-trip tests against Docker PG + API route tests + manual UI screenshots. |

### D-022 schema detail

| Table | Columns |
|---|---|
| `items` | `id` text PK, `type` text, `title` text, `domain` text, `origin` text, `source_label` text, `status` text, `created_at` timestamptz, `updated_at` timestamptz |
| `item_content` | `item_id` text FK→items, `content_text`, `author`, `locator`, `filename`, `storage_ref`, `mime_type`, `captured_at`, `measured_at`, `definition`, `notes`, `claim`, `reasoning`, `name`, `steps`, `intended_use`, `statement`, `alternatives`, `consequences`, `source_item_id` text FK→items — all nullable |
| `relations` | `id` text PK, `kind` text, `from_id` text FK, `to_id` text FK, `note` text, `created_at` timestamptz, `created_by` text; unique `(kind, from_id, to_id)` |
| `events` | `id` text PK, `item_id` text FK, `at` timestamptz, `actor` text, `action` text, `detail` text |

Rationale: identities and relations explicit; typed fields queryable; no giant JSONB; 4 tables fit an MVP. Alternative: one wide `items` table (fewer joins, dirtier) or side tables per type (cleaner, more code). Chosen as smallest explicit model.

### D-023 endpoint detail

| Method | Path | Response |
|---|---|---|
| GET | `/api/items?type=&domain=&q=` | `{ok:true, items:ItemDTO[]}` |
| POST | `/api/items` | `{ok:true, item:ItemDTO}` |
| GET | `/api/items/:id` | `{ok:true, item, relations:{outgoing,incoming}, events:EventDTO[]}` |
| PATCH | `/api/items/:id` | `{ok:true, item:ItemDTO}` |
| POST | `/api/relations` | `{ok:true, relation:RelationDTO}` |

Errors: `{ok:false, kind, message, retryable}`. kinds: `contract` 400, `not_found` 404, `duplicate` 409, `db_unavailable` 503, `internal` 502. No zod; TS types + small shape-check functions, same as Thylas.

### D-024 environment detail

- `.env.example`: `PORT=8788`, `DATABASE_URL`, `STORAGE_DIR=./data/files`.
- SQL files under `server/persistence/migrations/`; Drizzle schema under `server/persistence/schema.ts`.
- Local file content written to `data/files/<id>`; DB stores `storage_ref` only.
- `psql` is not installed locally; use `docker exec` or Drizzle tooling for DB checks.

## 3. Dependency order

```text
P3-0 scaffold
  → P3-1 DB + schema
  → P3-2 contracts (can start in parallel with P3-1)
    → P3-3 data access
      → P3-4 item API
        → P3-5 relation API + detail assembly
          → P3-6 frontend shell + list
            → P3-7 vertical slice forms  [MILESTONE]
              → P3-8 provenance/relations/history read
                → P3-9 edit + link forms
                  → P3-10 file import + filters
                    → P3-11 verify + handoff
```

Do not skip ahead. If a task is blocked, log it in `KNOWN_ISSUES.md` and report; do not silently substitute another task.

## 4. Task cards

Each card: Purpose / Scope / Interacts with / Does not own / User flow / Minimum implementation / Test method.

### P3-0 — Scaffold and scripts

- **Purpose:** make the repo runnable.
- **Scope:** `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.env.example`, npm scripts.
- **Interacts with:** D-005 stack decision.
- **Does not own:** product logic, UI layout.
- **User flow:** `npm install` → `npm run dev` → empty app loads.
- **Minimum:** Vite serves a blank React page; `npm run check` passes.
- **Test:** run `npm run check`; expected exit 0.

### P3-1 — Database and schema

- **Purpose:** working persistence.
- **Scope:** Docker PG container, Drizzle schema, migration `0000_init.sql`, DB client.
- **Interacts with:** D-022, D-024.
- **Does not own:** domain validation, API routes.
- **User flow:** start container → apply migration → 4 tables exist.
- **Minimum:** DB client connects; migration is idempotent; tables queryable.
- **Test:** `npm run db:migrate`; then count tables via `docker exec`.

### P3-2 — Shared contracts

- **Purpose:** one type source for client and server.
- **Scope:** `src/lib/items.ts`, `relations.ts`, `events.ts`, `api.ts`, shape checks, error mapping.
- **Interacts with:** taxonomy docs, D-023.
- **Does not own:** persistence, HTTP transport.
- **User flow:** none directly; consumed by P3-3+.
- **Minimum:** DTOs and `isCreateItemBody` / `isCreateRelationBody` checks exist.
- **Test:** `npm test` contract tests: valid bodies pass; malformed bodies return `contract`.

### P3-3 — Data access layer

- **Purpose:** isolate SQL from domain logic.
- **Scope:** `server/repo/items.ts`, `relations.ts`, `events.ts`; typed queries.
- **Interacts with:** P3-1 schema, P3-2 contracts.
- **Does not own:** request parsing, UI.
- **User flow:** none directly.
- **Minimum:** create/read/update item; insert relation; append event; fetch detail.
- **Test:** repo round-trip test against Docker PG: create → read → update → read.

### P3-4 — Item API

- **Purpose:** expose item CRUD over HTTP.
- **Scope:** `server/index.ts`, `router.ts`, `http.ts`, `routes/items.ts`.
- **Interacts with:** P3-2, P3-3.
- **Does not own:** browser UI, relations route.
- **User flow:** POST item → GET list → GET detail → PATCH item.
- **Minimum:** four endpoints return contract shape; errors mapped.
- **Test:** route tests with fake req/res; `contract` 400, `not_found` 404.

### P3-5 — Relation API and detail assembly

- **Purpose:** make provenance and links inspectable.
- **Scope:** `routes/relations.ts`, detail assembly with outgoing/incoming events.
- **Interacts with:** `RELATIONSHIP_MODEL.md`, P3-3, P3-4.
- **Does not own:** graph traversal, inference.
- **User flow:** POST relation → reopen detail → both endpoints show link.
- **Minimum:** duplicate relation returns 409; derived_from max one per object.
- **Test:** route tests for create, duplicate, and detail payload.

### P3-6 — Frontend shell and Library list

- **Purpose:** replace in-memory prototype with real data.
- **Scope:** tokens, base CSS, `App.tsx`, `services/api.ts`, Library rows.
- **Interacts with:** `MVP_UI_SPECIFICATION.md`, P3-4.
- **Does not own:** forms, context view.
- **User flow:** open app → rows load from API → click row opens detail.
- **Minimum:** list renders real items; empty state works.
- **Test:** manual screenshot at 1440×900; rows match spec.

### P3-7 — Vertical slice forms [MILESTONE]

- **Purpose:** prove the core workflow.
- **Scope:** New raw item form, New object form, source picker, detail read.
- **Interacts with:** F1–F4, P3-4, P3-6.
- **Does not own:** automatic extraction, edit, link.
- **User flow:** New raw → save → New Concept + source → save → reopen detail.
- **Minimum:** source shows as derived_from; history event `created` visible.
- **Test:** manual end-to-end check; result recorded in status file.

### P3-8 — Provenance, relations, history display

- **Purpose:** answer "where did this come from / what changed".
- **Scope:** detail sections Provenance, Outgoing, Incoming, History.
- **Interacts with:** F7, P3-5.
- **Does not own:** diff viewer, audit policy.
- **User flow:** detail → read source → open source item → read events.
- **Minimum:** all four sections render from API payload.
- **Test:** screenshot of detail with ≥1 relation and ≥1 event.

### P3-9 — Edit and link forms

- **Purpose:** support evolution with traceability.
- **Scope:** inline Edit form, inline Link form, status changes.
- **Interacts with:** F5, F8, D-019, D-021.
- **Does not own:** raw content editing, conflict resolution.
- **User flow:** detail → Edit → save → history shows update; detail → Link → save.
- **Minimum:** raw content stays immutable; each mutation emits one event.
- **Test:** route + UI check: `updated_at` changes; history appends.

### P3-10 — File import and browse filters

- **Purpose:** complete raw information and discovery basics.
- **Scope:** `raw.filecontent` local storage; type/domain/keyword filters.
- **Interacts with:** F2, F6, D-020, D-013.
- **Does not own:** OCR, semantic search, pagination framework.
- **User flow:** import text file → row appears → filter by type/keyword → open.
- **Minimum:** file written to `data/files/<id>`; filters narrow rows.
- **Test:** import + filter check; no binary blob in DB.

### P3-11 — Verification and handoff

- **Purpose:** prove exit criteria and record state.
- **Scope:** full command suite, screenshots, docs updates, handoff report.
- **Interacts with:** all P3 tasks.
- **Does not own:** Phase 04 context views.
- **User flow:** run verification → fix failures → update docs → report.
- **Minimum:** all exit criteria in §1 satisfied or explicitly logged as known issue.
- **Test:** commands in §5; results copied into `IMPLEMENTATION_STATUS.md`.

## 5. Verification matrix

| Gate | Command / check | Expected |
|---|---|---|
| Types | `npm run check` | exit 0 |
| Unit + route tests | `npm test` | all pass; count recorded |
| Build | `npm run build` | exit 0 |
| DB | `npm run db:migrate` + table count | 4 tables |
| API smoke | `curl` POST/GET/PATCH/relation | contract-shaped JSON |
| UI | headless Chrome 1440×900 screenshots | Library, detail, New form render |
| Restart | restart PG container; reload API | data still present |
| No JSONB | grep schema for `jsonb` | no payload column |

## 6. Main risks

1. Docker container cannot actually start despite binary being present → block P3-1, report.
2. Wide `item_content` table drifts from taxonomy → update docs before adding columns.
3. Scope creep into Context Views, permissions, search → stop and log.
4. Duplicate/invalid relations → enforce in domain layer and test.
5. File path leaks or overwrites → store relative `storage_ref`, never absolute paths.
6. Tests claim success without evidence → record command and count in status file.

## 7. Open questions

1. Approve D-022 schema split: 4 tables and nullable typed columns?
2. Approve D-023 endpoint set and shared contract module names?
3. Approve D-024 container port `55433` and API port `8788`?
4. Approve D-025 test scope, including Docker-dependent DB tests?

All four are `PROPOSED`. Implementation starts only after approval.
