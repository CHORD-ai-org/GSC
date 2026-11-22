# 07 — Cross-Project Application Analysis

> Task §7 (mandatory): capability matrix, scenarios A/B/C, and the shared-vs-local
> conclusions. §10 coordination findings live here.

## 1. Capability matrix

| Capability | GSC | Thylas | Lemma |
|---|---|---|---|
| **Information Model** | **Defines it** for the ecosystem: hybrid Raw/Objects, relations, provenance, proposals (INFORMATION_MODEL.md, DECIDED) | Consumes + extends at Artifact level (versions, canonical reuse, governance docs) | Domain model centered on learning; *may map* concept-like objects onto shared primitives; must keep mastery/cognition local |
| **Classification** | Controlled type/lifecycle/relation kinds + free tag values (controlled dimension × free value × scope) | Artifact taxonomy + user-defined objects (TAXONOMY.md, USER-DEFINED-OBJECTS.md) | Concept/knowledge-structure taxonomies, curriculum structures |
| **Representation** | Persistent: Clusters, Contexts (explicit assembly). Working/scratch layer **absent** (gap) | Boards + canonical references = working + canonical representations already | Knowledge structures + study Space; reorganization = cognitive act |
| **Multiple Views** | Overview/list/grid/reader/Canvas-tree/Recently/Activity — all projections (Canvas explicitly "not the data model") | Home conversation, Coworker UI, boards, run views ("Intelligent UI" direction) | Learning views: concept map, path, quiz, progress (5 question types exist) |
| **Process Model** | Process-as-history (events, capture_tasks, Light Up phases); P/R modules absent | Run observability (running/decided/spent/stuck) fed by WAM — boundary preserved | Learning workflows + Socratic loops; process ≈ pedagogy |
| **Provenance** | **Defines it**: origin/source_label/events + SemTag machine vs confirmed; supersede chains | Artifact versions + authority + pinned references + proposals | Explain-why for learner growth; source attribution on materials |
| **Collaborative Editing** | Single-user-first; cluster shares (view/add); proposal→confirmation as agreement protocol | Multi-actor by design (User + Coworkers); canonical reuse = "agreement happens through proposals" — **same protocol pattern as GSC** | Learner + Agent co-editing of explanations (revise with agent — Scenario C) |
| **Context Assembly** | **Defines it**: Contexts (subject/scope/purpose + members); selection gaps; `buildAgentContext` export | Workspace resources + board selections; Coworker run scoping | Study scope: what materials this session covers; bounded practice sets |

## 2. Scenario walkthroughs (task §7)

### Scenario A — GSC (hundreds of objects)

Flow required: explore → find → understand relations → inspect provenance → custom
representation → ask Coworker to analyze a selected group → save resulting knowledge.

**[ours] How GSC supports it without becoming a KM app:** the *infrastructure* answer
(stable ids, search, relations, provenance, proposals) already exists; the gap list is
small and precise: (1) **selection→delegate** action (selected group → analysis request;
results as proposals — governance intact); (2) **kept representations** (03 ladder) for
custom arrangements; (3) engagement traces (A) for "what did the agent actually look at".
Everything else stays list/reader/search — the anti-KM-app discipline is: *representations
are optional lenses over canonical information, never prerequisites*.

### Scenario B — Thylas (research project with Coworkers)

Flow: share Artifacts → organize materials → common representation → observe agent
activity → modify agent output → preserve decisions/provenance → reuse prior work.

**[ours] Synthesis:** GSC supplies the information substrate + proposal agreement protocol;
Thylas supplies the shared representation (boards) + run views; missing glue is exactly
B's attribution (concurrent edits on shared boards) and A's traces (observe agent
activity = engagement traces, not chat logs). The CANONICAL-REUSE rule [repo] ("local work
on local objects; agreement through proposals") is the reuse answer — and it is
isomorphic to GSC D-042. **WAM boundary preserved**: run execution state stays WAM's;
Thylas projects it.

### Scenario C — Lemma (learner over months)

Flow: collect materials → build concepts/knowledge structures → understand relations →
identify gaps → reorganize understanding → revise explanations with agent → observe
development.

**[ours] How the shared capabilities serve learning WITHOUT importing GSC's domain:**
- Material collection = capture pattern (GSC-like) but learner-owned.
- Concepts/relations = shared primitives *shape* (typed nodes + edges + provenance)
  with **learning-specific semantics kept local** (mastery, misconception, confidence).
- Gap identification = Reflection (C's R module) as pedagogical act — Lemma-specific.
- Reorganization = cognitive change: representation history (03 §6) doubles as learning
  journal — this is Lemma's "observe their learning development" requirement.
- Revising explanations with agent = bidirectional editing (B): attribution must
  distinguish learner's own edits from agent's (protecting learner agency — a Lemma
  value, not a GSC one).

## 3. Required conclusions (task §7 "Required Conclusion")

1. **Shared primitives** *(candidates, not decisions)*: typed objects with provenance &
   lifecycle; typed relations; **proposal→confirmation agreement protocol** (verified
   independently in GSC D-042 and Thylas CANONICAL-REUSE — strongest shared primitive);
   representation-as-reference-set (units+relations+arrangement); engagement/event
   traces; explicit context/selection boundary.
2. **Shared interaction patterns**: select→delegate; explicit submission before agent
   acts; clarify-or-proceed; results land visibly + become reusable materials;
   edit-level attribution classes; drill-in traces ("evidence on demand").
3. **Shared infrastructure candidates**: provenance/trace recording; the agreement
   protocol engine (propose/accept/reject/defer — GSC `proposals` is one implementation);
   context assembly + export (GSC `buildAgentContext`); structured-object CRUD with
   governance. **NOT** proposed for sharing: databases, runtimes, UI kits.
4. **Domain-specific models**: GSC — cross-workspace information governance; Thylas —
   Coworker identity, Artifact versioning/authority, workspace tenancy; Lemma —
   cognitive state (mastery, misconceptions, growth), pedagogy (Socratic loops, quizzes).
5. **Domain-specific views**: GSC — library/reader/Canvas/Recently; Thylas — home
   conversation, run views, boards; Lemma — path/quiz/progress/concept-map-as-thinking.
6. **Concepts that should NOT be shared**: WAM runtime state (boundary, preserved);
   Lemma's learner model; Thylas's Coworker persona/memory; GSC's internal taxonomy
   should NOT be imposed on Lemma (task constraint).
7. **Possible future integration points**: context export/import (GSC↔Thylas already
   hypothesized via stable interfaces, MANIFESTO §5); proposal-protocol interop (an
   Artifact proposal could reference GSC objects); representation exchange format
   (units+relations+arrangement JSON — *if* Q-F goes beyond "concept only").

## 4. §10 Coordination sections

**A. Project-specific findings (GSC)**
- GSC's proposals + SemTag = a head start on CLEO's attribution problem (at origin
  level); extend to edit-level events.
- The 03 persistence ladder (scratch/kept/canonical) is the single most useful concept
  GSC could adopt — it fills the Canvas-persistence tension (D-079) cleanly.
- Engagement traces (A) fit the existing `events`/visits substrate; main work is schema
  + localized presentation, not new architecture.

**B. Cross-project findings (what others can reuse)**
- The proposal→confirmation agreement protocol (GSC implementation exists; Thylas
  already plans the same pattern).
- Context assembly semantics (subject/scope/purpose + explicit members) — reusable shape
  for Thylas run scoping and Lemma study scope.
- SemTag labeling pattern (machine vs confirmed vs original vs alert) — applicable to
  Lemma agent-revised explanations and Thylas agent outputs.

**C. Potential conflicts (explicit)**
1. **Artifact versioning vs GSC supersede**: Thylas canonical artifacts (authority,
   pinned versions, proposal-to-change) vs GSC items (superseded_by chains, no pinning).
   Two change-control philosophies. Do not silently merge (task §10).
2. **GSC "no automatic extraction"** (MVP rule) vs D's agent-reorganization ambitions:
   fine for now (proposals), but if Malleable Context Space wants agent-driven structural
   edits, GSC governance needs an explicit evolution path (propose→confirm for
   *structure*, not just content).
3. **Lemma independence**: the working hypothesis diagram could be read as "Lemma depends
   on GSC" — the task forbids assuming that. Lemma may adopt *concepts* without adopting
   infrastructure; treat as Q-F.
4. **Process first-class (C)** would add a new entity family to GSC — conflicts with the
   recorded discipline "don't turn every concept into a database entity" unless Q-D
   resolves with strong evidence.

**D. Shared concepts (need consistent definitions)** — see `10-glossary.md`:
Information Object, Representation, View, Process, Provenance, Context/Context Entry,
Evidence, Activity/Event.

**E. Domain-specific concepts (stay local)**
- GSC: Chunk/Object taxonomy specifics, capture pipeline, MCP/API surface.
- Thylas: Coworker, Workspace tenancy, Artifact authority model.
- Lemma: mastery, misconception, learning path, Socratic turn, quiz item.

**F. Questions for other agents**
- *To Thylas agent*: (1) Does the Artifact authority model expect per-version approval
  (like GSC proposals) or curator roles? (2) How do Coworkers consume GSC — direct API,
  WAM-mediated, or via exported context packages? (3) Do boards persist agent-generated
  cards as first-class artifacts immediately (B's intermediate results) or as drafts?
- *To Lemma agent*: (1) Is the learner's concept graph a *representation of understanding*
  (to be reorganized) or an *information model* (to be governed)? (2) Which shared
  primitives are acceptable dependencies without threatening product independence? (3)
  Does learning-journal history need engagement-trace granularity (per-material reads)
  or just milestone events?
- *To GSC agent (us, for completeness)*: we need founders to resolve Q-D and Q-F before
  any schema work.
