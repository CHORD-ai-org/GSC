# KNOWN_ISSUES.md — Limitations and Unresolved Problems

Updated: 2026-11-19 (Phase 05 UI shell in progress).

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

## Phase 05 — open questions and gaps

| Item | State |
|---|---|
| GSC Agent real model calls | proposer is stub-tested only — this environment has no LLM network/key. Set `GSC_LLM_BASE_URL`/`GSC_LLM_API_KEY`/`GSC_LLM_MODEL` in `.env.local` and use 「Agent 建议」 to verify. |
| listItems fields bug (fixed 2026-11-20) | `listItems` previously returned empty `fields` (no content join) — broke content keyword search (D-020) and detector similarity. Fixed; regression covered by detector tests. |

| Item | State |
|---|---|
| GitHub Sync real-network verification | adapter tested with stubbed fetch only — this environment cannot reach api.github.com. Run `Sync now` against a real `owner/repo` + token when network is available. |
| Notion / Drive / X sources (PLAN-3 B3-1) | blocked on OAuth app credentials + network; connect form accepts them but sync returns a contract error until adapters land. Brand logos are letter badges until official assets can be vendored. |
| Migration idempotency | migrations re-run every startup; files 0002–0004 now use `IF NOT EXISTS` — keep new migrations idempotent. |

| Item | State |
|---|---|
| Canvas entry point (Q1) | Default: not a sidebar row; opened from Overview 「画布预览」 and `Ctrl+O`. Overview opens the canvas window (empty state); the empty state's 「画布预览」 activates the card grid. Confirm placement if a sidebar row or separate window is wanted. |
| Sync placement (Q2) | Default: `ORGANIZATION` group (Contexts, Sync). Alternative: bottom cluster with Settings/Documentation. |
| Composer submit without an LLM (Q3) | Captures text as `raw.document` with `source_label` `composer:<mode> · <model>`. Model inference is `DEFERRED` (`D-033`). |
| "Rym" spelling (Q4) | Copied literally from the design board; rename when a real model list exists. |
| Mic button | Visual only; no voice capture. |
| Page-switch mosaic animation | Plays via CSS overlay; not visible in static screenshots (see `ui-prototype/shots/`), verified by code review and build. |
| `favicon.ico` | 404 in dev server console; cosmetic only. |

## Risks to watch in Phase 06

1. Claiming scenario success without observed results.
2. Treating explicit Context Views as dynamic Context Assembly.
3. Adding permissions or Coworker concepts before requested.
4. Silent import of Thylas runtime code or tokens.
5. Adding types or retrieval features not required by scenarios A–D.
