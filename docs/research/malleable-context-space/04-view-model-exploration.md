# 04 — View Model Exploration

> Question: **how can the same information and representation be presented differently?**
> Core discipline: **A View is a projection, not a data model** (task quality bar #7/#9/#10:
> not every view needs storage; a Graph View ≠ a graph database; a Spatial Workspace ≠
> an infinite canvas).

## 1. Anchor from Research C

**[paper]** The Interaction Layer provides "projections" of the process: "the same
underlying process may be projected as a conversational exchange, a workflow diagram, a
timeline, or a spatial workspace" — UI decoupled from process logic. This is exactly the
View/Representation split: views are **modality × density × initiative** projections over
a shared substrate.

GSC precedent (verified): the Canvas tree (D-079) is explicitly "a navigational projection
of the Information Space, not the underlying data model" — the principle is already
adopted once. The view model question generalizes it.

## 2. View candidates (exploration, not mandatory set)

For each: intent / density / object types / operations / read-write / operates-on /
saveable? (**[ours]** columns filled from project reality + research.)

| View | User intent | Density | Types | Operations | R/W | Operates on | Saveable? |
|---|---|---|---|---|---|---|---|
| Overview | "what's in my space" | low | all | navigate, summary actions | R (+quick add) | information space | no (computed) |
| Object list / library | scan, filter, manage | med→compact | one domain | edit, tag, bulk (GAP-10 done) | RW | information (+filters) | filters yes (saved views = GAP plan D-series) |
| Source / reader | read original + provenance | comfortable | raw.* | annotate, derive | R (+annotation) | information | n/a |
| Relations / graph | understand connections | medium | objects + relations | navigate, propose edges | R (+proposal) | information | no (projection) |
| Timeline / activity | "what happened recently" | medium | events | inspect, revisit | R | events/traces | no |
| Spatial workspace | think-with-materials, arrange | user-controlled | units + marks | group, connect, delegate (E-style) | RW | **working representation** | yes (representation) |
| Process / workflow | track ongoing work | medium | process modules (C) | steer, reframe | RW | **process** | yes if process is first-class (Q-D) |
| Comparison | decide between candidates | high, focused | 2–n objects | diff, decide, record decision | RW (creates Decision) | information | as Decision object |
| Learning view (Lemma) | understand my growth | adaptive | concepts + mastery | revise, quiz, reorganize | RW | learning model | learner-journal |

Existing GSC surfaces map as: Overview ✓, list/grid toggle ✓ (viewMode), reader/detail ✓,
Canvas tree ✓ (projection), Recently (timeline-ish ✓ with accessed/created/modified),
ActivityMap ✓, comparison → only via Decision objects today (candidate gap).

## 3. The View ≠ Representation rule, applied

- Switching list ↔ grid changes nothing persistent (already true in GSC).
- The **spatial view is special**: it edits a working representation (its arrangement is
  the point). This answers Q-C partially — spatial is *both* a view and an environment
  with its own state (E: "shaping the space" is an activity, not a render mode).
- A "graph view" reads relations; drawing an edge in it should **propose** a relation
  (governance preserved), not write one silently.
- Process view (if Q-D goes first-class) projects the process model; per C, *the same
  process must be projectable as chat or diagram* — never fork data per view.

## 4. Static vs dynamic views (Q-A) — evidence

- C [paper]: users should "navigate between different levels of abstraction" — implying
  user-configurable projections over one substrate.
- D [paper, abstract]: organization "developed in use" — views that freeze organization
  early will fight users.
- E [paper]: users' spatial arrangements become meaningful structures (cases show
  organization into visual structures) — **saving a dynamically arranged state has real
  value** (contra "all dynamic views are throwaway").

**[ours]** The pragmatic answer is a spectrum: system views (fixed) → parameterized views
(saved filters/arrangements, cheap) → representation-backed views (saved because they
edit a kept representation). Whether "Agent-generated views" become first-class is a
founder question — minimal version: agent assembles a *representation*, and any view can
render it.

## 5. Density & cognitive load (ties to §6 of the task)

Existing GSC decisions to preserve: comfortable/compact density pref (D-083 era),
progressive disclosure (metadata fold), SemTag always text+color. **[ours]** Each view
should declare its **primary question** (one page one question — already a GSC rule) and
its disclosure ladder (primary → secondary → technical). Evidence-on-demand: A [paper,
abstract]'s "localized visualizations" for evidence inspection = drill-in traces, not
forever-visible audit tables.

## 6. Customization & saving

| Level | Persist where | Notes |
|---|---|---|
| Transient (scroll, zoom, pan) | none | restore-optional |
| Preferences (density, theme, language) | user prefs | exists (prefs.ts) |
| Saved filters/views ("本周的决策") | small saved-view records | already a planned D-series divergence item |
| Arrangements | working representation (kept layer) | see 03 §4 |
| Canonical structures | Contexts/Clusters/Artifacts | governed, exists |

## 7. Open → 09
Agent-generated views first-class or not; per-view permission overlays; whether timeline
views read engagement traces (A) or only CRUD events; spatial-view persistence details (Q-C).
