# PHASE_04_PLAN.md — Execution Plan

Status: `DECIDED` — 2026-11-19. User approved the Phase 04 plan with "开始执行".

## Goal

One Knowledge Context. Explicit member list only. No retrieval engine.

## Task cards

Each card: purpose / scope / interacts with / does not own / user flow / minimum implementation / test method.

### P4-0 — Contexts schema and migration

- **Purpose:** persist Context Views and explicit membership.
- **Scope:** `contexts`, `context_members` tables; `0001_contexts.sql`.
- **Interacts with:** `server/persistence/schema.ts`, migration runner.
- **Does not own:** membership inference, permissions.
- **User flow:** none directly.
- **Minimum:** migration applies on existing DB; tables queryable.
- **Test:** `npm run db:migrate` + table-count check.

### P4-1 — Context contracts and repository

- **Purpose:** one type source and typed data access.
- **Scope:** `src/lib/contexts.ts`, `server/repo/contexts.ts`.
- **Interacts with:** `ItemDTO`, `items` table, contract pattern.
- **Does not own:** HTTP transport, UI.
- **User flow:** none directly.
- **Minimum:** create/update/list/get context; add/remove member; duplicate rejected.
- **Test:** repo round-trip with in-memory PGlite.

### P4-2 — Context API

- **Purpose:** expose context operations.
- **Scope:** `GET/POST/PATCH /api/contexts`, `GET /api/contexts/:id`, `POST/DELETE /api/contexts/:id/members`.
- **Interacts with:** `server/router.ts`, contracts, repository.
- **Does not own:** permissions, retrieval.
- **User flow:** create context → add member → reopen detail → remove member.
- **Minimum:** contract errors and `not_found` / `duplicate` mapped.
- **Test:** route tests with fake req/res.

### P4-3 — Context UI

- **Purpose:** inspect and edit explicit membership.
- **Scope:** Contexts view, context list, detail meta, add/remove member, open member detail.
- **Interacts with:** `src/app/App.tsx`, API service, existing row/field styles.
- **Does not own:** graph canvas, dashboard, context assembly.
- **User flow:** Contexts → New context → add existing items → click member → item detail → remove member.
- **Minimum:** membership persists across reload.
- **Test:** headless Chrome screenshots at 1440×900.

### P4-4 — Verification and handoff

- **Purpose:** prove Phase 04 exit criteria and record state.
- **Scope:** checks, tests, build, API smoke, restart persistence, docs.
- **Interacts with:** all P4 tasks.
- **Does not own:** Phase 05 scenarios.
- **User flow:** run checks → fix failures → update docs → report.
- **Minimum:** all checks pass or logged as known issue.
- **Test:** commands in §3.

## Verification

| Gate | Command / check | Expected |
|---|---|---|
| Types | `npm run check` | pass |
| Tests | `npm test` | all pass; count recorded |
| Build | `npm run build` | pass |
| DB | `npm run db:migrate` + `node scripts/db-check.mjs` | 6 tables |
| API smoke | `npm run api:check` | item + context checks pass |
| Restart | restart API; GET context | members persist |
| UI | headless Chrome 1440×900 | Contexts view renders |

## Non-goals

No automatic assembly. No permissions. No User/Workspace/Coworker Context. No Thylas integration. No vector/graph DB.
