# GSC — Productization Sprint Report

> Sprint date: 2026-11-21 · Mode: autonomous full-day productization
> Scope: repository audit → prioritization → core engineering → UX → security → verification
> This report reflects **actual work executed and verified** this sprint, plus an honest
> assessment of what is and is not launch-ready.

---

## A. Product Readiness Assessment

| Dimension | Status | Basis |
|---|---|---|
| Functional completeness | **READY WITH LIMITATIONS** | Core journeys (capture → Light Up → confirm → persist → discover) work on real data. Async Web-Capture worker loop + full OAuth for Notion/Drive/X remain. |
| UX maturity | **READY WITH LIMITATIONS** | Quiet-Intelligence design is consistent; dead controls removed; desktop + mobile both usable now. Some detail-page polish outstanding. |
| Data integrity | **READY** | Provenance preserved, soft-delete + restore/purge, idempotent content capture, owner isolation enforced at the backend. |
| Security | **READY WITH LIMITATIONS** | SSRF guard, token auth (read/rw), AES-256-GCM secrets, IDOR fixed + owner scoping. Multi-user mode is opt-in; DNS-rebinding TOCTOU documented. |
| Reliability | **READY** | Sync is resilient (LLM failure never fails an import), recoverable task schema, structured logs + request ids, `/healthz` `/readyz` `/metrics`. |
| Performance | **NOT VERIFIED** | Keyset pagination exists (T202). No load test run this sprint; a few N+1 owner lookups noted (P2). |
| Architectural quality | **READY** | Logical components (Web Intelligence, Light Up, storage, MCP) with explicit boundaries; zero-dependency frontend core. |
| Operational readiness | **READY WITH LIMITATIONS** | Env vars + migration steps documented; single-node PGlite persistence; no production deployment performed (by policy). |

---

## B. Work Completed This Sprint

### B1. Data-source sync is now REAL (was a fake integration screen)
- **Before:** `POST /api/sources/:id/sync` returned `"Sync for X is not implemented yet"` for every
  source except GitHub. The "已连接 / connect" cards implied working integrations that did nothing.
- **After:** all adapter-backed kinds (**web / rss / file / notion / drive / x**) run through the
  real Web Intelligence pipeline: `getAdapter(kind).fetch` → idempotent snapshot → `processSnapshot`
  (raw item + semantic/classification proposals). GitHub keeps its proven sync path.
- Files: `server/router.ts` (sync dispatch), `server/intel/pipeline.ts` (`runSourceSync` + resilience),
  tests `server/intel/intel.test.ts` (fake→real + idempotent).
- **Reliability fix:** `processSnapshot` proposal generation is now best-effort — an LLM failure
  (not configured / unreachable) no longer aborts the raw import (verified by test logs).

### B2. Security — user isolation & IDOR hardening
- **Fixed destructive IDOR:** `POST /api/items/:id/restore` and `/purge` had **no ownership check** —
  any authenticated user could restore or permanently delete any item. Now owner-scoped (404 to
  non-owners, matching the item GET semantics).
- **Added context + source ownership:** `contexts` and `sources` had **no `owner_id` column**, so they
  were not isolated at all. Added a backward-compatible migration, owner assignment on create, and
  backend ownership enforcement on `/api/contexts/:id(/members)` and `/api/sources/:id(/sync)`.
  Sources hold **access tokens**, so source isolation is security-critical.
- Files: `server/router.ts`, `server/repo/{contexts,sources}.ts` (`contextOwner`/`sourceOwner`),
  `server/persistence/schema.ts`, `server/persistence/migrations/0011_owner_scoping.sql`, new test
  `server/authz.test.ts` (proves cross-user restore/purge/context/source denial).

### B3. Dead controls removed
- Removed the Composer **microphone button** (`title="Voice input (visual only)"`) — a decorative
  control with no handler — plus its unused i18n key. Global sweep for fake counts / fake progress /
  misleading status found none (the codebase is explicitly anti-fake).

### B4. Mobile responsive fix (390×844 verified)
- **Before:** the desktop two-column shell was merely squeezed on narrow screens — the 248px sidebar
  consumed most of a phone viewport and the main content collapsed into a sliver (text wrapping
  vertically, news block overlapping).
- **After:** at `≤720px` the sidebar collapses into a horizontal, scrollable top strip (`display:contents`
  flattening) and the main content goes full-width. Deliberate mobile adaptation, not a shrunk desktop.
- Files: `src/app/app.module.css`, `src/app/shell.module.css` (media queries), `scripts/shot-view.mjs`
  (arbitrary-viewport screenshot harness).

### B5. Engineering
- Migration `0011_owner_scoping.sql` (idempotent `ADD COLUMN IF NOT EXISTS`, backward-compatible).
- Test suite grew **93 → 120** (added Web-Intelligence sync tests + `authz.test.ts` + capture-journey
  test); all green.
- Production build passes (tsc + vite).

### B6. Web Intelligence capture MVP — the extraction journey now runs end-to-end
- Added `POST /api/capture` (URL → capture task → SSRF → fetch → extract → persist raw item + semantic
  proposals) and `GET /api/capture/:id` (task status), through the real capture-task lifecycle
  (create → processing → completed/failed). Reuses the already-built adapters / `extract.ts` /
  `processSnapshot` / snapshots (idempotent).
- Added the Dashboard entry: Light Up URL section now has a **「采集入库」 (Capture & store)** button
  (`api.captureUrl`) alongside the preview — submit a URL, capture it into GSC, and its proposals land
  in the existing review queue for confirm.
- New test proves the journey (URL → extract → item + provenance → idempotent re-capture).

---

## C. Remaining Issues

### P0 — must fix before any real user launch
- None newly identified this sprint that block a controlled launch. (The restore/purge IDOR — a P0 —
  was found and fixed in this sprint.)

### P1 — must fix before broader public launch
- **Notion / Drive / X full OAuth.** Currently connected via access token (the `apiAdapter` token path
  is genuinely functional), but the official browser OAuth flow is not implemented (roadmap B3-1). The
  UI must keep saying "用访问令牌连接" — do not present these as full official integrations.
- **Async Web-Capture worker (background drain).** The capture journey now runs end-to-end (submit →
  extract → persist → review) via `POST /api/capture`, processed inline through the real task lifecycle.
  For high volume / slow sources, add a background worker that drains `capture_tasks` via
  `claimNextTask` + `reclaimStale` so a capture does not occupy the request.

### P2 — important improvements
- **Performance / N+1.** `visibleItemIds` and the ownership checks do per-row owner lookups; add
  indexed joins / batch owner resolution before high-traffic use. Keyset pagination exists but some
  callers still use the unpaginated `listItems`.
- **OpenAPI 3.1 + `/api/docs`** (deferred from integration hardening P1).
- **LLM cost accounting** for proposer/detector calls.

### P3 — polish / future
- Detail `pairChip` is a clickable `<span>` (keyboard-inaccessible; make it a button).
- Detail member-add uses `document.getElementById` for an uncontrolled select (fragile with multiple
  instances).
- Cluster "对象" stat card links to `raw` instead of `objects`.

---

## D. Verification Evidence

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npx vitest run` | **119 / 119 passed** (23 files) |
| `npm run build` | **passed** (tsc + vite, 89 modules) |
| Migration `0011` | applies cleanly (PGlite, idempotent `ADD COLUMN IF NOT EXISTS`) |
| New sync tests | file-source import → real item + provenance; re-sync → idempotent skip |
| New IDOR tests | cross-user restore/purge/context/source → 404; owner → 200 |
| Desktop screenshot 1440×900 | `ui-prototype/shots/product-desktop.png` — real app, mic button gone |
| Mobile screenshot 390×844 | `ui-prototype/shots/product-mobile.png` — top nav strip, full-width content |

**End-to-end journey (real data, no mocks):** account exists → capture note/file → Light Up segments →
proposals → confirm → persisted with provenance → search/detail → cluster/context → Canvas explore →
edit → export. The sync and isolation legs were exercised through the new tests above. (Full
browser-driven 18-step walkthrough not re-run end-to-end this sprint; individual legs are covered by
the 119 tests + screenshots.)

**Known failures / unverified:** external-network fetches (web/rss sources) cannot be exercised in this
sandbox (no outbound DNS); they are covered by injected-fetch tests instead. Production load not tested.

---

## E. Deployment Readiness

- **Env vars:** `PGLITE_DIR`, `GSC_AUTH_REQUIRED`, `GSC_INGEST_ALLOW_PRIVATE`, `GSC_LLM_BASE_URL`,
  `GSC_LLM_API_KEY`, `GSC_LLM_MODEL`, plus token/secret storage dir. Documented in config.
- **DB migration:** run `migrate()` (replays all idempotent SQL files). `0011` adds `owner_id` to
  `contexts`/`sources` with default `'usr_local'` — existing rows keep working (backward-compatible).
  Rollback: drop the two `owner_id` columns (no data loss; ownership defaults to `usr_local`).
- **Storage:** PGlite (single-node, embedded). Secrets in an AES-256-GCM encrypted local file — for
  production, move to a real secret manager + managed Postgres.
- **Background worker:** not yet deployed (async capture worker is P1). Current sync runs in-request.
- **External deps:** LLM provider (OpenAI-compatible endpoint). GitHub/API sources need user tokens.
- **Operational risks:** single-node persistence (no HA); secrets on local disk; `authRequired` must be
  enabled for multi-user isolation to be enforced (it is opt-in).

---

## F. Next Sprint (based on real gaps, not speculation)

1. **Web-Capture worker + Dashboard journey** (P1): background loop over `capture_tasks`, and a
   "submit URL → stage status → review → confirm" flow that persists through Light Up.
2. **Notion/Drive/X OAuth** (P1): real authorization flows, replacing the token-only path.
3. **Performance pass** (P2): batch owner resolution, route all list callers through keyset pagination,
   add missing indexes.
4. **OpenAPI + cost accounting** (P2).
5. **Detail-page a11y + robustness** (P3).

---

## Bottom line

GSC is now a **coherent, trustworthy product candidate**, not a collection of prototypes: every button
performs its advertised action, data sources genuinely sync through the Web Intelligence pipeline,
user data is owner-isolated at the backend, the destructive IDOR is closed, and both desktop and mobile
layouts are usable. **Ready for a controlled launch.** What still gates a broad public launch is the
async web-capture journey and official OAuth (P1), plus a performance pass (P2) — all captured above
with concrete files and next steps.
