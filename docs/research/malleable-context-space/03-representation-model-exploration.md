# 03 — Representation Model Exploration

> Question: **how are information objects selected and organized for a working purpose?**
> This is the heart of "Malleable Context Space". Exploration only.

## 1. Core distinction (established in this research)

**[ours, from D]** A **Work Representation** is the organization of units and relations that
humans and agents form and revise *to advance work* — not the information itself, not the
UI, not the storage. D [paper, abstract]: "humans and agents form and revise a Work
Representation and use its organization to advance work within a wider Work Environment";
"representational roles and organization developed in use."

So there are (at least) three layers to keep separate:

```text
Persistent information  ──(selection + arrangement)──▶  Working representation  ──(projection)──▶  View
   (GSC objects, sources)                                  (clusters / contexts /                 (list, canvas,
                                                            boards / study space)                  timeline…)
```

## 2. What counts as a representation today (three projects, verified)

| Project | Existing representation-like structure | Persistent? | Owner |
|---|---|---|---|
| GSC | **Clusters** (many-to-many membership) | yes | user (+ shares) |
| GSC | **Contexts** (explicit purpose-specific assembly: subject/scope/purpose + members) | yes | user |
| GSC | Canvas tree (D-079) | **no** — navigational projection only ("not the underlying data model") | n/a |
| Thylas | Boards / workspace whiteboards (definition.md: "a whiteboard with the conflicting claims laid out") | yes (artifacts) | user + coworkers |
| Thylas | Canonical references (pinned versions into other workspaces) | yes | reference holders |
| Lemma | Knowledge structures (concept maps), learning paths, study Space | yes (partly) | learner |

**[ours]** GSC already *has* persistent representations (Cluster/Context) but no
**temporary** working representation concept. Canvas deliberately refuses persistence
(D-079: "navigational projection… do not introduce mutations to canonical data merely
because a user expands, collapses, or navigates"). That refusal is correct for *navigation*
but may be too strong for *working arrangements* (see §4).

## 3. Units, relations, groups — what a representation model needs

Candidate primitives (consolidating D's units/relations, E's selections/marks, C's
Environment artifacts):

- **Unit**: a reference to a persistent object (not a copy) + local presentation state.
- **Relation**: typed semantic edge (authoritative, lives in information model) vs
  **arrangement** (spatial/temporal adjacency, lives in the representation).
- **Group**: nested or flat clustering *within* a representation (Thylas boards show
  cards grouped by hand; GSC clusters are global — different scopes!).
- **Sequence**: ordered units (relevant for Lemma learning paths and GSC Light Up steps).
- **Mark/annotation**: E [paper] ink marks are content + instruction + context boundary.
  Generalized: annotations attached to units or regions of the representation.
- **Selection**: the transient subset currently in focus — E's evidence says selections
  *delimit agent context*; therefore selection is semantically meaningful, not just UI.

**Key semantic warning (from §1 synthesis):** arrangement (spatial proximity) must stay
**soft metadata**; semantic relations stay explicit. E's "local targeting difficulties"
[paper] show spatial addressing is error-prone; D shows organization develops in use —
so representations must tolerate ambiguity and be reorganizable cheaply.

## 4. Temporary vs persistent — the pivot question (Q-E)

Facts to anchor the debate:

- B [paper]: **intermediate results get reused** ("intermediate result appropriation") —
  users take partial outputs and keep working. If temporary representations vanish, this
  reuse breaks.
- D [paper, abstract]: roles/organization "developed in use" — early states are exploratory
  and probably shouldn't be persisted with full ceremony.
- GSC governance: machine-made structure is proposal-only; user-confirmed structure
  persists. Thylas CANONICAL-REUSE [repo]: "local work happens on local objects;
  agreement happens through proposals."

**[ours] Three-layer persistence ladder** (proposal for discussion, not decision):

1. **Scratch** — private, auto-expiring (drafts, canvas pan states, explorations).
2. **Kept** — user-pinned working representations (survive sessions; not shared by
   default) — *this is the layer GSC lacks today*.
3. **Canonical** — shared, governed structures (GSC Contexts/Clusters, Thylas canonical
   artifacts) — already exists, already governed.

The research never demands every representation persist (task quality bar #8); the ladder
makes the choice explicit per representation.

## 5. User-created vs agent-created vs shared

| Kind | Creation | Mutation rights | Evidence anchor |
|---|---|---|---|
| User arrangement | direct manipulation (E) | user free; agent proposes reorganization | D: agent reorganization rarely supported — treat as proposal |
| Agent arrangement | generation during task | agent may assemble; structural changes → **proposal** | GSC D-042; Thylas proposals [repo] |
| Shared representation | pinned/canonical | agreement protocol (proposal→confirm) | CANONICAL-REUSE [repo]; A: shared histories aid agents |
| Private exploration | scratch layer | owner only | [ours] inference from D "developed in use" |

## 6. Representation history

A [paper, abstract]: engagement traces attached to documents help both sides. D: roles
develop in use. **[ours]** Combine: a representation should carry (a) structural-move
history (group/pin/move events) and (b) engagement traces (who read/edited/annotated) —
both *derived from events*, not separately maintained logs. GSC's `events` table is the
candidate substrate; the open question is event granularity (see 05/09).

## 7. Cross-project applicability (short)

- **GSC**: add a "kept/scratch" layer only if Scenario A (hundreds of objects, custom
  representations for analysis) demands it; Context/Cluster stay canonical.
- **Thylas**: boards are already working representations with persistence — the gap is
  agent-readable traces (A) and attribution (B), not the representation itself.
- **Lemma**: knowledge structures are representations *of understanding*; reorganization
  there = cognitive change (see 07 Scenario C) — representation history doubles as
  learning journal.

## 8. Unresolved → 09
Persistence thresholds; representation sharing/permissions; copy-vs-reference in export;
group nesting depth; how agent reorganization proposals are rendered.
