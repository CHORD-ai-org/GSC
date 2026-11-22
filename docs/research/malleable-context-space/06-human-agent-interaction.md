# 06 — Human-Agent Interaction Exploration

> Task §6: direct manipulation / conversation / bidirectional editing / mutual awareness /
> cognitive load. Evidence anchors: B (CLEO), E (Inkitiate), A (Ream), C (IPI), D (Malleable).

## 1. Direct manipulation

**[paper, E]** Ink + selection + spatial marks express intent; **selections and spatial
marks delimit** what the agent uses and where results go; users group/organize materials
into meaningful visual structures; "shaping the space" is a first-class activity.
Observed cost: "difficulties addressing local targets" — precise targeting is hard.

**[paper, D]** Reorganization of representations by humans and agents is the model's
core, but systems mostly support only *local incorporation* of agent outputs — i.e.
direct manipulation of structure is undersupported in current systems.

**[ours] Implications per project**
- GSC: selection→"ask about these" is the cheapest direct-manipulation bridge (Scenario A
  requirement: "ask a Coworker to analyze a selected group"). The Canvas already selects
  nodes; the missing act is *delegate-with-selection*.
- Thylas: boards already offer card arrangement; delegation gestures (CLEO's spatial
  manipulations of agent presence [paper]) are a candidate for Coworker UX.
- Lemma: mind-map restructuring = thinking; agent proposals on structure must stay
  proposals (cognitive ownership).

## 2. Conversational interaction

**[paper, E]** Ink queries combine linguistic + referential + spatial marks; explicit
submission (not ambient listening); clarification loops (suggested options or more ink);
abort available. **[paper, B]** voice with deictic referencing in probe 1.

**[ours]** The conversation contract across projects should standardize three things:
(1) **referent resolution** (what objects does "this/these" mean — resolved against the
current selection/representation, not chat history alone); (2) **scope declaration**
(which materials are in play — bounded context); (3) **clarify-or-proceed** (ask when
ambiguous; E shows users *want* to correct interpretation). GSC's Context is the
persistent form of (2); the transient form is selection (E).

## 3. Bidirectional editing (the CLEO problem)

**[paper, B]**
- Study 1 failure: agent could not attribute concurrent canvas changes → reverted or
  misread user edits → users stopped intervening. *Visibility without attribution
  produces conflicts, not collaboration.*
- CLEO fix: User Change Detection + Attribution Change modules; agent adapts plan.
- Five action patterns each imply different responses (direct edit → judge scope &
  propagate or keep local; artifact takeover → preserve separate areas; opportunistic
  takeover → update remaining plan; intermediate-result appropriation → preserve taken
  outputs).

**[ours] Attribution is a shared-primitive candidate.** A minimal attribution record:
`{actor, action, object, timestamp, intent-class (feedback | independent | co-edit |
takeover | reuse), scope}`. GSC's SemTag machine/user distinction covers *origins*; this
adds *edit-level* classes. Whether intent-class is inferred (CLEO-style modules) or
declared (user marks "this is feedback") is open — CLEO evidence favors inference +
override.

Conflict-resolution stance (preserve GSC governance): user edits always win on
user-owned content; agent edits on user content are **proposals**; concurrent conflicts
surface as explicit reconciliation UI (never silent last-write-wins on semantic fields).

## 4. Mutual awareness (Ream)

**[paper, A, abstract]** Structured artifacts + bidirectional engagement tracking +
localized visualizations; same traces serve human inspection and agent retrieval; users
steer agents, communicate through annotations, reflect on research focus; agents build on
earlier work via shared history.

**[ours] Product translation:** an "activity layer" on every persistent object:
who did what, when, why (rationale) — drill-in, not wall-of-log (localized). For GSC this
extends `events`; for Thylas it feeds the run view; for Lemma it doubles as learning
journal ("observe their learning development" — Scenario C). Privacy/scope of traces is
cross-project open question (GAP-15 adjacency).

## 5. Cognitive load

Preserved GSC decisions: progressive disclosure, one-page-one-question, comfortable/
compact density, minimal unnecessary decoration, SemTag text+color. Research support:
**[paper, C]** warns representation overhead may exceed benefit for trivial work →
disclosure must also apply to *process/awareness surfaces* (traces collapsed by default).
**[paper, A]** "localized" visualization = evidence on demand. **[paper, E]** users
valued output form for downstream work → completion experiences should show *where
results landed and how reusable they are* (matches GSC Light Up completion experience).

Rules we propose (consistent across projects):
1. Show the working representation first; metadata on demand.
2. Machine interpretation always labeled (SemTag pattern) and reversible.
3. Confirmation only where authority changes (don't ask twice for reversible acts).
4. Defaults: agent acts only on explicit submission; results land in the visible
   workspace at user-indicated places (E) or as proposals (GSC governance).
5. Density adapts to view purpose, not to user sophistication guessing.

## 6. Quick cross-walk (task's five subsections → evidence → owner project)

| Need | Evidence | GSC | Thylas | Lemma |
|---|---|---|---|---|
| Select → delegate | E, Scenario A | selection + ask-Coworker (gap) | board cards + Coworker runs | select concepts → ask agent |
| Concurrent edits | B | proposals protocol | boards co-editing (gap: attribution) | agent revises explanations |
| Traces both ways | A | events (gap: engagement) | run view (WAM-fed) | learning journal |
| Process steering | C | Light Up phases (fixed) | run steering | learning path steering |
| Reorganization | D | clusters/contexts (user); agent proposes | boards (user) | knowledge maps (cognitive) |
