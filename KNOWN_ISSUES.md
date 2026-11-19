# KNOWN_ISSUES.md — Limitations and Unresolved Problems

Updated: 2026-11-19 (Phase 04 complete).

## Resolved in Phase 01

| Issue | Resolution |
|---|---|
| Local PostgreSQL unavailable | Docker PostgreSQL chosen (`D-004`, `DECIDED`); container not yet started |
| Stack unconfirmed | Vite/React/TS/CSS Modules + `node:http` + Drizzle/PG + Vitest confirmed (`D-005`) |
| Prototype UI placement | standalone app + Overview-style section (`D-010`) |
| Object types unreviewed | five types finalized (`D-006`); Principle/Experience/Taxonomy deferred (`D-011`) |

No unresolved blocker prevents implementation.

## Resolved in Phase 02

| Issue | Resolution |
|---|---|
| Form layout | inline panels; no dialogs (`D-019`) |
| Keyword filter | case-insensitive substring over title + typed text (`D-020`) |
| Stance display | literal `supports` / `challenges` labels with `+` / `−` glyphs (`D-021`) |

## Resolved in Phase 03

| Issue | Resolution |
|---|---|
| Physical schema shape | `D-022` implemented as four tables |
| API contract modules and shapes | `D-023` implemented in `src/lib` and `server/router.ts` |
| Docker ports | API uses `8788`; Docker `55433` remains future-only |
| Test scope | `D-025` implemented: 16 tests + API/UI checks pass |
| Docker daemon unavailable | PGlite fallback active (`D-026`); data persists locally |

## Known gaps by design

| Gap | Reason | Revisit when |
|---|---|---|
| PostgreSQL adapter is not active | Docker daemon unavailable; PGlite fallback active | deployment or Docker availability |
| `ui-prototype/index.html` does not persist | earlier static prototype; live app is now the real client | not applicable |
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

## Resolved in Phase 04

| Issue | Resolution |
|---|---|
| Context View not implemented | explicit Knowledge Context with persisted members (`D-027`…`D-029`) |
| Context Space vs View boundary | `CONTEXT_VIEWS.md` |
| Context persistence | `contexts` and `context_members` tables |

## Risks to watch in Phase 05

1. Claiming scenario success without observed results.
2. Treating explicit Context Views as dynamic Context Assembly.
3. Adding permissions or Coworker concepts before requested.
4. Silent import of Thylas runtime code or tokens.
5. Adding types or retrieval features not required by scenarios A–D.
