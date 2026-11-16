# THINKING.md — Active Task

> Last updated: 2026-11-16
> Standing instruction: read this file before every answer in this workspace.
> Status: Phase 01 COMPLETE. Awaiting user review before Phase 02 implementation design.

## User approvals received 2026-11-16

1. Enter Phase 01 (documentation only; no implementation code).
2. Local persistence: Docker PostgreSQL (`DECISION_LOG.md` D-004 → `DECIDED`).
3. Recommended stack confirmed (`D-005` → `DECIDED`).
4. UI placement: standalone app + Overview-style section (`D-010` → `DECIDED`).

## Completed work

- Phase 00: repository and Thylas audit; 12 documents created; report delivered.
- Phase 01: information model finalized; four taxonomy/model documents now exist:
  - `INFORMATION_MODEL.md` — shared metadata, status vocabulary, provenance/history, Context View rule
  - `RAW_INFORMATION_TAXONOMY.md` — Document / Message / Evidence / FileContent
  - `STRUCTURED_OBJECT_TAXONOMY.md` — Concept / Hypothesis / Methodology / Decision / EvidenceReference
  - `RELATIONSHIP_MODEL.md` — derived_from / references / related_to / supports / challenges

## Decision labels in use

`DECIDED` · `PROPOSED` · `OPEN` · `DEFERRED`. Never upgrade `PROPOSED` to `DECIDED` without user confirmation.

## Verified facts carried into Phase 02

- Thylas has GSC only as one manifesto file: `docs/product/gsc/MANIFESTO.md`. No GSC code, route, store, section, table, or API exists there.
- Thylas stack: Vite 6 + React 19 + React Router 7 + TypeScript 5.7 + CSS Modules + design tokens; no Tailwind, no UI kit, no state library.
- Thylas backend: `node:http` thin server, shared `createApiRouter()`, Drizzle ORM + `pg`, PostgreSQL dialect, 3 tables (`conversations`, `messages`, `files`), no pgvector.
- API contract pattern: `src/lib/<domain>.ts` shared by server and client; TS types + small shape-check functions; no zod.
- Thylas Overview sections: header, intent input, Continue, Needs you, Workspaces, Recently, plus optional Ask panel. No GSC section.
- Local environment: Node v22.22.2, Docker 29.1.5 available; no reachable PostgreSQL yet; no container started.

## Open questions for Phase 02

1. Exact form layouts and field order for each create/edit action.
2. Whether keyword filtering is plain substring over title + content, and where the control sits.
3. How `supports` / `challenges` are visually marked in a detail view (`RELATIONSHIP_MODEL.md` §5 is `PROPOSED` only).
4. When to provision the Docker PostgreSQL container — Phase 03, not Phase 02.

## Next action after approval

Phase 02 — write `MVP_USER_FLOWS.md`, `MVP_UI_SPECIFICATION.md`, and a UI prototype. No persistence code. Then update status and handoff files.
