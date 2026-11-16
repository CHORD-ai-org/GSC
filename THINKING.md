# THINKING.md — Active Task

> Last updated: 2026-11-16
> Standing instruction: read this file before every answer in this workspace.
> Status: Phase 02 COMPLETE. Awaiting user review before Phase 03 implementation.

## User approvals received 2026-11-16

1. Enter Phase 01 (documentation only; no implementation code).
2. Local persistence: Docker PostgreSQL (`DECISION_LOG.md` D-004 → `DECIDED`).
3. Recommended stack confirmed (`D-005` → `DECIDED`).
4. UI placement: standalone app + Overview-style section (`D-010` → `DECIDED`).
5. "开始执行Phase 02" — enter Phase 02 (interaction design + UI prototype; still no persistence code).

## Completed work

- Phase 00: repository and Thylas audit; 12 documents created; report delivered.
- Phase 01: information model finalized; 4 model/taxonomy documents.
- Phase 02:
  - `MVP_USER_FLOWS.md` — 8 workflows (F1–F8), 4 scenario walks, navigation hierarchy
  - `MVP_UI_SPECIFICATION.md` — screens S1–S7, tokens, components, closed UI decisions
  - `ui-prototype/index.html` — self-contained interactive prototype, in-memory only
  - D-019/D-020/D-021 closed the three Phase 01 UI questions

## Decision labels in use

`DECIDED` · `PROPOSED` · `OPEN` · `DEFERRED`. Never upgrade `PROPOSED` to `DECIDED` without user confirmation.

## Verified facts carried into Phase 03

- Thylas has GSC only as one manifesto file: `docs/product/gsc/MANIFESTO.md`. No GSC code, route, store, section, table, or API exists there.
- Thylas stack: Vite 6 + React 19 + React Router 7 + TypeScript 5.7 + CSS Modules + design tokens; no Tailwind, no UI kit, no state library.
- Thylas backend: `node:http` thin server, shared `createApiRouter()`, Drizzle ORM + `pg`, PostgreSQL dialect, 3 tables, no pgvector.
- API contract pattern: `src/lib/<domain>.ts` shared by server and client; TS types + small shape-check functions; no zod.
- Local environment: Node v22.22.2, Docker 29.1.5 available; no reachable PostgreSQL; no container started.
- Prototype verified at 1440×900 via headless Chrome: Library, New form, and Contexts screens render without overlap.

## Open questions for Phase 03

1. Physical schema: explicit typed columns for each object type vs a shared item table plus typed side tables.
2. API contract module names and request/response shapes.
3. Docker PostgreSQL container provisioning and `DATABASE_URL`.
4. Test scope: contract tests, API route tests, persistence round-trip tests.

## Next action after approval

Phase 03 — scaffold the standalone app, shared contracts, `node:http` API and Drizzle/PG persistence. Implement one vertical slice first: create a raw item → create a Concept → attach source → reopen detail. Then update status and handoff files.
