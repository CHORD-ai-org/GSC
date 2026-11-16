# KNOWN_ISSUES.md — Limitations and Unresolved Problems

Updated: 2026-11-16 (Phase 01).

## Resolved in Phase 01

| Issue | Resolution |
|---|---|
| Local PostgreSQL unavailable | Docker PostgreSQL chosen (`D-004`, `DECIDED`); container not yet started |
| Stack unconfirmed | Vite/React/TS/CSS Modules + `node:http` + Drizzle/PG + Vitest confirmed (`D-005`) |
| Prototype UI placement | standalone app + Overview-style section (`D-010`) |
| Object types unreviewed | five types finalized (`D-006`); Principle/Experience/Taxonomy deferred (`D-011`) |

No unresolved blocker prevents Phase 02 documentation.

## Open decisions for Phase 02

| Issue | Impact | Status |
|---|---|---|
| Exact form layouts and field order | Needed before UI prototype | `OPEN` |
| Keyword filter scope and control placement | Needed for browse workflow | `OPEN` |
| Visual marking of `supports` / `challenges` in detail view | `RELATIONSHIP_MODEL.md` §5 is `PROPOSED` | `PROPOSED` |
| Docker PostgreSQL container provisioning | Persistence cannot be tested until Phase 03 | `DEFERRED` to Phase 03 |

## Known gaps by design

| Gap | Reason | Revisit when |
|---|---|---|
| No code, package manifest, schema, API, or tests | Phases 00–01 are documentation-only | Phase 03 |
| No permission system | Explicitly out of MVP | after Phase 05 |
| No semantic search / vector index | Explicitly out of MVP | demonstrated need |
| No WAM, Coworker, or LLM integration | Architectural independence | explicit request |
| No Thylas code changes | D-003 | integration phase |
| No automatic extraction or validation | Out of scope | explicit request |
| No Context Assembly automation | Phase 04 uses explicit assembly | after Phase 04 |
| No graph canvas | relation display is Outgoing/Incoming lists | explicit request |

## Reference-project drift — do not copy stale docs

| Topic | Detail |
|---|---|
| Thylas docs claim no dark mode | code has 3 themes (`src/styles/themes.css:62`) |
| Thylas docs claim IBM Plex Sans UI font | code uses Inter Variable (`src/styles/typography.css:12`) |
| Thylas docs list `--t-page:24/32` | code uses 20/28 |
| Thylas docs propose react-router 8 | code still uses react-router-dom 7.1.1 |
| Thylas `AGENT.md` references lowercase `thinking.md` | actual file is `THINKING.md` (Windows case-insensitive) |

Rule: `THYLAS_REFERENCE.md` records verified values. Re-check code before reusing any Thylas pattern.

## Risks to watch in Phase 02–03

1. UI built before workflows are written (decorative prototype).
2. Adding types not required by scenarios A–D.
3. Single JSONB blob as system of record.
4. Silent import of Thylas runtime code or tokens.
5. Claiming tests passed without recording command and result.
