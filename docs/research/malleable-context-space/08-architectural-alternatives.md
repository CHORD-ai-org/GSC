# 08 — Architectural Alternatives

> Task §8: for each major question, ≥2 plausible alternatives with pros/cons/implications
> per project and unknowns. **No winner declared** unless evidence strongly supports it
> (it doesn't, in any case below).

## A — Static or dynamic views? (Q-A)

**A1. System views only (fixed projections).**
- ✅ Simple, no storage, predictable; matches current GSC (list/grid/Canvas/Recently).
- ❌ Kills "save my arrangement" workflows (D shows organization develops in use; E shows
  arrangements carry meaning).
- GSC: no change. Thylas: boards compensate (badly). Lemma: concept-map views fixed.

**A2. Parameterized saved views (filters/settings persist; renderings computed).**
- ✅ Cheap; covers "本周的决策" saved-filter use cases (already a GSC D-series plan);
  no new data model.
- ❌ Doesn't capture spatial/structural arrangements.
- GSC: saved-view records only. Thylas/Lemma: same pattern per domain.

**A3. Views as projections over saved representations (representations persist; views are
render modes).**
- ✅ Unifies with Q-E; agent-generated "views" reduce to agent-generated representations
  (governance-friendly); C's "same process, multiple projections" satisfied.
- ❌ Requires the kept-representation layer first; risk of representation sprawl.
- Unknowns: does arrangement need per-view overlays (e.g. hidden units)?

## B — Static or dynamic classification? (Q-B)

**B1. Fixed dimensions, free values (status quo: controlled type/lifecycle/kinds + tag
values).**
- ✅ Prevents fragmentation (recorded failure mode: ontology explosion); governance-safe.
- ❌ New emergent roles (D: "roles develop in use") have nowhere to live except free text.
- GSC: zero change. Thylas: USER-DEFINED-OBJECTS.md already leans this way. Lemma: local
  vocabularies free.

**B2. Extensible dimensions with proposal-gated introduction (users/agents propose new
types/roles; human approves).**
- ✅ Handles emergent roles without fragmentation; reuses the agreement protocol.
- ❌ Taxonomy governance cost; every product needs a curator UX.
- Unknowns: per-workspace or global vocabularies?

**B3. Fully dynamic user/agent taxonomies (folksonomy).**
- ✅ Maximum malleability.
- ❌ Fragmentation across workspaces/projects; cross-project sharing breaks (task warns
  against a universal ontology too — B3 is the opposite failure).
- Reject only if founders value cross-project consistency over malleability — mark as
  genuine open choice.

## C — Spatial workspace: view or environment? (Q-C)

**C1. Spatial is just another view (render mode over the same representation).**
- ✅ Simple; Canvas-tree precedent (projection only).
- ❌ Contradicts E evidence: shaping the space IS the work (marks, marks-as-instructions,
  local context); a view can't hold ink semantics.

**C2. Spatial is a working environment with its own representation + state (kept layer).**
- ✅ Matches E (three activities) and D (Work Environment); supports marks/selections as
  semantic acts.
- ❌ Persistence questions multiply (what survives close?); "infinite canvas" trap (task
  quality bar #10 warns against equating the two).

**C3. Hybrid: spatial = view over a representation, PLUS a scratch layer of transient
marks.**
- ✅ Arrangement persists (kept representation); ink/marks can be scratch or promoted to
  annotations; graceful degradation to lists.
- ❌ Two persistence tiers inside one surface — needs clear UX (what's kept vs what fades).
- Unknowns: do spatial adjacencies ever become semantic relations (03 says: only as
  proposals)?

## D — Process: first-class structure? (Q-D)

**D1. Process-as-derived (events + computed views) — status quo+.**
- ✅ No new entities; C's overhead warning respected; GSC unchanged architecturally.
- ❌ Goals/framings/reflections (P/R) remain unrepresented; C argues this is exactly why
  chatbots/copilots fail at long work.

**D2. Process-as-first-class (Process entity with P/W/O/E/R slots).**
- ✅ Direct C fidelity; inspectable/editable strategy; longitudinal co-evolution enabled.
- ❌ New entity family + governance + UI (violates "no unnecessary entities" unless
  evidence strong — C is conceptual, unvalidated longitudinally).

**D3. Hybrid: optional structured work-entries attached to Contexts/Clusters over the
event substrate.**
- ✅ Pay-as-you-go (trivial work stays trivial — C's own caution); reflections/decisions
  as proposals/objects; events remain ground truth.
- ❌ Work-entry schema design risk; two sources of truth if events and entries diverge.
- GSC: moderate change. Thylas: run view could project work-entries. Lemma: learning
  entries fit naturally.

## E — Representation persistence threshold (Q-E)

**E1. Everything ephemeral (arrangements are views; persist only canonical).**
- ✅ Zero sprawl. ❌ Breaks B's intermediate-result reuse and E's cumulative work.

**E2. Everything persistent by default.**
- ✅ Nothing lost. ❌ Sprawl; noise in search/Recently; governance fatigue.

**E3. Persistence ladder (scratch auto-expiring / user-kept / canonical-governed) — see
03 §4.**
- ✅ Matches evidence (D "developed in use" needs cheap early states; B reuse needs kept
  states; GSC/Thylas governance needs canonical states).
- ❌ Tier-transition UX must be trivial or users won't promote.
- Unknowns: default TTL of scratch; whether agents may auto-promote (presumed: no).

## F — CHORD ↔ Lemma sharing strategy (Q-F)

**F1. Concepts only (shared vocabulary + patterns; independent implementations).**
- ✅ Zero coupling; respects Lemma independence (task constraint); fastest.
- ❌ Reimplementation drift; no interoperability.

**F2. Shared specification (representation/proposal/trace schemas as published specs;
separate implementations conform).**
- ✅ Consistency without runtime coupling; enables later exchange (import/export).
- ❌ Spec maintenance cost; premature spec risk (task: don't choose without evidence).

**F3. Shared SDK/API (common library or service — e.g. both call GSC).**
- ✅ Maximum reuse (single implementation of agreement protocol, traces).
- ❌ Violates "do not assume Lemma must depend on GSC"; operational coupling; premature
  before Q-D/E resolve.
- Unknowns: does Lemma's product independence allow infrastructure dependency? (Ask
  Lemma agent + founders.)

## G (bonus) — Edit-level attribution mechanism (from B, cross-cutting)

**G1. Inferred by agent modules (CLEO-style detection + attribution).** ✅ low user
burden ❌ inference errors (B Study 1 shows consequences of wrong attribution).
**G2. Declared by users (mark "this is feedback").** ✅ precise ❌ friction; users won't
always mark.
**G3. Inferred + override (default inference, user can reclassify).** ✅ balance
❌ needs conflict UI. Evidence (B) leans G3 but with the explicit reconciliation surface.
