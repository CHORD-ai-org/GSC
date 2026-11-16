# KNOWN_ISSUES.md — Limitations and Unresolved Problems

Updated: 2026-11-16 (Phase 02).

## Resolved in Phase 01

| Issue | Resolution |
|---|---|
| Local PostgreSQL unavailable | Docker PostgreSQL chosen (`D-004`, `DECIDED`); container not yet started |
| Stack unconfirmed | Vite/React/TS/CSS Modules + `node:http` + Drizzle/PG + Vitest confirmed (`D-005`) |
| Prototype UI placement | standalone app + Overview-style section (`D-010`) |
| Object types unreviewed | five types finalized (`D-006`); Principle/Experience/Taxonomy deferred (`D-011`) |

No unresolved blocker prevents Phase 02 documentation.

## Resolved in Phase 02

| Issue | Resolution |
|---|---|
| Form layout | inline panels; no dialogs (`D-019`) |
| Keyword filter | case-insensitive substring over title + typed text (`D-020`) |
| Stance display | literal `supports` / `challenges` labels with `+` / `−` glyphs (`D-021`) |

## Open decisions for Phase 03

| Issue | Impact | Status |
|---|---|---|
| Physical schema shape | Determines migrations and typed-field queries | `OPEN` |
| API contract modules and request/response shapes | Blocks implementation of F1–F8 | `OPEN` |
| Docker PostgreSQL container provisioning | Persistence cannot be tested until provisioned | `DEFERRED` to Phase 03 |
| Test scope for Phase 03 | Must be recorded with command and result | `OPEN` |

## Known gaps by design

| Gap | Reason | Revisit when |
|---|---|---|
| No code, package manifest, schema, API, or tests | Phases 00–02 are design + static prototype only | Phase 03 |
| Prototype does not persist | `ui-prototype/index.html` uses in-memory sample data by design | Phase 03 |
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

## Risks to watch in Phase 03

1. Treating the static prototype as a working product; it is in-memory only.
2. Single JSONB blob as system of record.
3. Silent import of Thylas runtime code or tokens.
4. Claiming tests passed without recording command and result.
5. Adding types or retrieval features not required by scenarios A–D.
