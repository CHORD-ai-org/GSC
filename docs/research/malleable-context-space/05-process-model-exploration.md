# 05 — Process Model Exploration

> Question: **how is ongoing work represented and preserved?** The decision "process
> first-class vs event-derived vs structured workflow" is explicitly NOT settled here
> (task §5.4 / Q-D).

## 1. The strongest evidence: Research C's Process Layer

**[paper]** Process is proposed as "an explicit, inspectable structural representation of
activities" — a first-class concern, with a five-module model:

| Module | Content | Adaptation move |
|---|---|---|
| Problem Space (P) | goals, assumptions, hypotheses, constraints, framing | **reframing** |
| Workflow (W) | stages, partial orders, dependencies, parallel threads | **reorganization** |
| Operations (O) | tools, procedures, capabilities | reparameterization |
| Environment (E) | artifacts, intermediate results, workspace state | reshaped by operations |
| Reflection (R) | meta-monitoring; detects inconsistencies; decides structural change | mediates R→{P,W,O,E} |

Three-layer placement: Interaction (projections) / Process (representation) /
Infrastructure (models+tools). Named failure modes of alternatives: chatbots lose P in
chat history; copilots fix W to the application; task agents hide W and R (restart on
failure instead of collaborative adjustment). Named costs: **representation overhead**,
over-structuring exploratory work, divergent human/agent interpretations.

## 2. What GSC has today (verified) — process-as-history

- `events` table (append-only-ish activity facts), visits (accessed tracking), `updated_at`,
  provenance (origin/source_label), proposal lifecycle (pending→accepted/rejected/deferred),
  Light Up phases (capture→understand→shape→curate→illuminate) as a *workflow instance*,
  capture_tasks (queued/processing/completed/failed) as *task state*.
- GSC does **not** currently store goals/assumptions/reflections as structures.

**[ours] Assessment:** GSC implements ~40% of C's model implicitly: E ≈ information space,
W ≈ Light Up/capture pipelines (fixed workflows), O ≈ integrations/API tools; P and R are
missing as representable content (users' *why* lives in notes and Decisions).

## 3. Candidate forms (alternatives live in 08-§D)

- **Form 1 — Process as event-derived** (status quo+): enrich events; compute process
  views (timelines, "what changed why"). Low overhead; weak on goals/reflection.
- **Form 2 — Process as first-class object**: a `Process`/`WorkLog` entity with P/W/O/E/R
  slots (links to objects), edited by humans and agents. High fidelity to C; overhead +
  new governance surface.
- **Form 3 — Hybrid**: keep events as ground truth; allow optional structured "work
  entries" (goal + steps + decisions + reflections) attached to Contexts/Clusters;
  Reflection prompts are agent proposals. **[ours]** this mirrors GSC governance best
  (proposals for machine thinking, user-confirmed structure).

## 4. Process vocabulary disambiguation (glossary cross-ref: 10)

| Term | Working definition here | Where it lives today |
|---|---|---|
| Process | structured representation of ongoing activity (C) | absent |
| Task | bounded unit with state (capture_tasks) | GSC capture_tasks |
| Operation | available action/tool | GSC API/MCP tools |
| Activity | ambiguous — use "engagement" (A) or "event" | events/visits |
| Event | immutable fact record | GSC events |
| History | derived chronology of events | computed |
| Reflection | meta-level assessment leading to structural change | absent (agent rationales in proposals are a seed) |

## 5. How process state should relate to information objects (task question)

**[ours]** Rule candidates:
- Process references objects; objects never embed process state (keeps GSC's model clean —
  quality bar #6 "don't turn every concept into a database entity").
- Intermediate results are ordinary objects with provenance (`origin: agent/import`,
  linked to the process entry) — satisfies B's intermediate-result reuse and A's traces.
- Decisions produced by process are Decisions (object.decision) — Scenario C continuity.

## 6. Evolution across sessions & observability

C [paper] names "longitudinal co-evolution": structured traces + rationale let systems
learn collaboration patterns. A [paper]: shared histories help agents build on earlier
work. **[ours]** Minimum viable cross-session continuity = engagement traces + decisions +
kept representations (03 ladder). Full process modeling is the moonshot, gated on Q-D and
C's own overhead warning: "representation overhead… may not be necessary for trivial
tasks" — so any process capture must be **optional per work item**, defaulting to plain
events.

## 7. Cross-project notes
- Thylas run views (definition.md: "whether it is running, what it decided, what it spent")
  are process observability at the *task* level, fed by WAM — boundary preserved (WAM owns
  runtime; Thylas projects it).
- Lemma learning paths are process-like but goal = cognitive growth; its Reflection slot
  ≈ metacognition prompts. Process primitives could be shared; learning semantics not.

## 8. Open → 09
Q-D (first-class vs derived); process granularity; permission on process entries; how
Reflection outputs are stored (proposals? decisions?); interplay with WAM runtime state.
