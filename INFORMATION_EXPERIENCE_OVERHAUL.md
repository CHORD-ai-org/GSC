# GSC — Information Experience Overhaul (Interim)

> Goal: information product, not database admin. Direction: Quiet Intelligence × Editorial Craft.
> Status: **in progress** — foundation + flagship verified; remaining pages continuing.

## 1. Design Decisions

**Presentation system over component library (§3).** Established a reusable editorial system:
- **Type scale** (`tokens.css`): page / title / section / object / body / meta / caption — distinct sizes +
  line-heights + slight negative tracking on headings. Reading comfort is a core capability.
- **Spacing scale** (`--sp-1..8`).
- **Density** (§3.3): `comfortable` (default) / `compact`, a real preference (`prefs.density` →
  `<html data-density>`), toggled in Settings › 界面 › 信息密度. Compact tightens rows and shortens previews.
- **Reading measure** (`--read-width: 70ch`) on long content.

**Metadata policy (§3.4): reading over inspecting.** Raw technical fields (e.g. `source_label`
`sync:web:https://…`) are no longer primary content. The source library shows title + content preview +
clean source (hostname / author) + date; technical identifiers stay in the detail rail's "More" fold.

## 2. Before / After (Raw Information)

| | Before | After |
|---|---|---|
| Row content | title + raw `sync:web:…` source string + time | title + **content preview** + type · **clean source** + time |
| Source shown | technical `source_label` | `api.github.com` / author (derived) |
| Typography | one flat size | type-scale hierarchy (title > preview > time) |
| Density | fixed | comfortable / compact toggle |
| Feel | DB table | editorial source library |

Evidence: `ui-prototype/shots/overhaul-raw.png`.

## 3. Implementation (Stages C–F)

**Stage C — core data pages**
- Object rows (knowledge library, §4.3): semantic preview (definition/claim/statement/reasoning/steps/name)
  via broadened `previewOf` + source-library row (title + preview + type · N sources).
- Raw source library (§4.2): content preview + clean source (done earlier).
- Detail reader (§4.7): type-scale + progressive disclosure (rail + More fold) — primary/secondary/advanced.

**Stage D — Light Up + Web Intelligence**
- **Async capture worker** (§6.3, reliability): `runCaptureWorker` in `pipeline.ts` — `reclaimStale`
  (worker-interruption recovery) + `claimNextTask` drain + idempotent `processCaptureTask`, each task marked
  completed/failed so retries never half-finish. Started as a 3s background interval in `server/index.ts`.
  `POST /api/capture` stays inline (owner-correct); the worker recovers interrupted/queued work safely.
- **Understanding Summary** (§5.3): digest strip at the top of the Light Up review (source · chars · units
  identified · awaiting review) before detailed review.

**Stage E — Overview / Canvas**
- Type scale lifts Overview + Canvas via shared classes. Responsive verified (mobile sidebar → top strip).

**Stage F — Verification** — see §4.

## 4. Verification

- `npx tsc --noEmit` → 0 errors.
- `npm run build` → passed (tsc + vite, 74 kB CSS).
- `npx vitest run` → **120 / 120** (23 files, no regression).
- Screenshots: `overhaul-raw.png` (desktop source library), `overhaul-raw-mobile.png` (390×844 responsive).

## 5. Remaining (next sprint)

- **Light Up Review Workbench** (§5.4): full 3-pane (source | proposals | detail) + keyboard nav + batch
  confirm UX (Understanding Summary + operations are in; the full workbench layout is the next step).
- **Capture Center** (§6.1): a dedicated capture-activity surface (tasks/completed/failed/history).
- **Structured Objects**: per-type semantic detail layouts (Concept/Decision/Methodology) beyond the shared shell.
- **Recently**: accessed/created/modified distinction (only if access history is tracked).
- **Overview/Canvas** deeper polish: large-data virtualization, empty states.
- **Full-async capture** (enqueue + return promptly + owner_id on tasks) — deeper than the recovery worker.
- Accessibility pass (focus/contrast/keyboard) + cognitive-load audit (§7).

## 6. Launch Readiness

| Capability | Status |
|---|---|
| Editorial presentation system (type/spacing/density) | **READY** |
| Raw source library + Object knowledge rows | **READY** |
| Detail reader (progressive disclosure) | **READY** |
| Async capture worker (drain + interruption recovery) | **READY** |
| Light Up Understanding Summary | **READY** |
| Overview / Canvas (responsive) | **READY WITH LIMITATIONS** |
| Light Up 3-pane Review Workbench, Capture Center, per-type Object detail | **IN PROGRESS** |
