# 01 — Research Synthesis: Five Directions

> Evidence labels: **[paper]** = stated by the paper at the inspected level (abstract-level
> claims marked), **[ours]** = our interpretation or product implication.
> Evidence levels: A abstract-only · B/C/E partial full-text · D abstract-only.

---

## 1. Direction A — Ream (mutual awareness)

*Ream: Unfolding Mutual Awareness in Human-Agent Workspaces* — Peiling Jiang, Sangho Suh,
Varsha Kishore, Jonathan Bragg, Haijun Xia, Pao Siangliulue, Daniel S. Weld, Amy X. Zhang,
Joseph Chee Chang et al. (UC San Diego / AI2 / UW), arXiv 2610.09497, submitted 2026-10-07.

**[paper, abstract-level]** As agents work in shared workspaces a "mutual awareness
challenge" arises: agents act faster than humans can monitor, and users' evolving interests
are not always expressed in chat. Ream is a literature-review workspace supporting mutual
awareness through **structured artifacts, bidirectional engagement tracking, and localized
visualizations**. Users can see each party's activity within documents; **agents can
retrieve the same history to guide their work**. In studies with eighteen researchers,
participants used traces to inspect evidence, steer agents, communicate through annotations,
and reflect on their research focus; shared histories helped agents build on earlier work.

Answering the task's questions at abstract level:
- People understand what agents did → engagement traces visualized *inside* the work object.
- Agents understand what people changed → the same history is agent-readable.
- Collaboration history attached to persistent objects → yes: traces live *within documents*.
- Provenance as working experience, not detached audit log → yes: localized visualization
  for steering, annotation, reflection.

**[ours]** This is the strongest evidence that provenance should graduate from an audit
appendix to an interaction surface — and that *the same trace* must serve both directions
(human-inspectable and agent-retrievable). GSC already records `events` + `origin` +
`source_label`; what is missing is the engagement layer (what each participant read,
touched, annotated) and its localized presentation. Limitation: abstract only; study
detail (trace granularity, conflicts) not inspected.

## 2. Direction B — CLEO (concurrent collaboration & attribution)

*"When to Hand Off, When to Work Together: Expanding Human-Agent Co-Creative Collaboration
through Concurrent Interaction"* — arXiv 2603.02050 (Figma-based probes; versioned
submissions v1/v2).

**[paper]** Study 1 (N=10 professional designers) probe gave process transparency (visible
Figma operations, agent presence, voice). Finding: transparency let users anticipate and
intervene, but the agent **could not attribute canvas changes** — it misread concurrent
user edits as its own state and sometimes reverted them. Result: users stopped intervening.
This gap is named **collaborative context awareness**: distinguishing whether a simultaneous
user action is *feedback on agent work*, *independent parallel work*, or *co-editing to
incorporate*.

**[paper]** CLEO (Collaborative Linked Executive Operator) adds a User Change Detection
module and an Attribution Change module (comparing tool results against pre/post canvas
state), then adapts its plan. Study 2 (two-day, stimulated recall) found five action
patterns (hands-off / observational / concurrent / directive / terminating; detailed codes
include direct edits, artifact takeover, opportunistic takeover, intermediate-result
appropriation), six intervention triggers, four enabling factors, and a six-loop decision
model. Reported dynamics (v2, N=10, 214 turns): delegation 70.1%, direction 28.5%,
concurrent 31.8% (overlapping categories). *Version note: another report of the study
states 12 designers / 255 turns / 33.73% concurrent — treat exact figures as
version-dependent.*

**[paper]** Each action pattern implies a different agent response: direct edit → judge
intended scope before propagating; artifact takeover → preserve separate work areas;
opportunistic takeover → update the remaining plan; intermediate-result appropriation →
preserve the taken outputs.

**[ours]** The pivot for all three projects: **attribution is a data problem before it is
a UI problem.** GSC's proposal→confirmation + SemTag vocabulary (original / confirmed /
machine / alert) already separates machine products from user authority — but at object
creation level, not at *edit* level. If humans and agents will edit the same representation
(Thylas boards, Lemma explanations), we need an edit-level attribution vocabulary. CLEO's
taxonomy is the best-evidenced starting point. Also note the failure mode: *visibility
without attribution produces conflicts, not collaboration* — directly relevant to Light Up
and any future co-editing.

## 3. Direction C — Interaction, Process, Infrastructure

*Interaction, Process, Infrastructure: A Unified Framework for Human-Agent Collaboration* —
arXiv 2506.11718 (Microsoft Research listing).

**[paper]** Three-layer architecture: **Interaction Layer** (projections of the process —
chat, canvas, workflow diagrams; modality × initiative; UI decoupled from process logic),
**Process Layer** (explicit, inspectable, editable representation of ongoing activity),
**Infrastructure Layer** (LLMs, APIs, storage; swappable).

**[paper]** Five-module Process Model: **Problem Space** (goals, assumptions, framing) /
**Workflow** (stages, dependencies, parallel threads) / **Operations** (tools, procedures,
capabilities) / **Environment** (shared workspace: artifacts, intermediate results) /
**Reflection** (meta-level monitoring; decides when structural change is needed).
**Structural Adaptation**: reframing (P), reorganization (W), reorientation — mediated by
Reflection (R→{P,W,O,E} feedback loops).

**[paper]** Diagnostic of existing paradigms: chatbots collapse process into chat history
(lose Problem Space); copilots are application-bound (fixed Workflow); task agents keep
Workflow/Reflection opaque (human cannot adjust strategy mid-flight). None have a shared,
explicit process representation. Named challenges: **representation overhead** (may not be
worth it for trivial tasks), risk of over-structuring exploratory work, and divergent
human/agent interpretations of the process model. Future direction: longitudinal
co-evolution (process traces + rationale → learning collaboration patterns).

**[ours]** This is the most direct answer to "should working processes become persistent,
addressable structures?" — *yes as an explicit representation, but with overhead warnings.*
For GSC it poses a real fork: GSC currently has events + provenance + proposal workflow
(process-as-history) vs C's process-as-first-class-structure. Note the Interaction Layer's
"same process, multiple projections" is precisely a View Model claim (see 04).

## 4. Direction D — Working Through Representation / Malleable Workspace

*Working Through Representation: Malleable Workspaces for Human-Agent Knowledge Work* —
Nan Chen, Long Ling, Luna K. Qiu, Zilong Wang, Yuqing Yang (Microsoft Research Asia /
Tongji / CataX AI), arXiv 2610.30893, submitted 2026-10-22.

**[paper, abstract-level]** Conceptual model of how humans and agents **form and revise a
Work Representation** and use its organization to advance work within a wider **Work
Environment**. Method: conceptual analysis + comparison of **58 papers** + construction and
**three-month longitudinal study of MalleableSpace** with seven experienced agent users.
Findings at abstract level: systems varied in what they represented as **units and
relations**; system-assembled context was common; **more systems supported local
incorporation of agent outputs than reorganization**; **fewer supported consequential
agent-driven changes beyond the representation**; the field study showed representational
roles and organization **developed in use**; representation-grounded action **depends on
and can change the Work Environment**.

Answering the task's questions at abstract level:
- Work Representation ≠ database/document/workspace: it is the *organization* humans and
  agents form and revise to advance work (units + relations + their arrangement).
- Representations guide action: "use its organization to advance work"; action is
  representation-grounded.
- Both sides reorganize: model is bidirectional in principle, but evidence shows systems
  rarely support agent-driven reorganization (a gap, not a solved capability).
- Representation ↔ environment: action depends on and can change the Work Environment.
- **R1/R2/R3: NOT INSPECTED** (abstract-level access only) — do not cite.

**[ours]** Critical nuance beyond "a canvas is useful": the model says *organization itself*
is the working object, and that "representational roles develop in use" — representations
are emergent in practice, not fully designed upfront. The 58-paper survey result (systems
prefer local incorporation over reorganization) is a warning for us: agent-driven
reorganization of user structures is the *hardest, least-solved* capability — matching
GSC's governance instinct (machine products are proposals, not structural mutations).

## 5. Direction E — Inkitiate (situated, ink-initiated interaction)

*Inkitiate: Initiating and Steering Agent Assistance through Ink in a Spatial Workspace* —
Fugee Tsung, Liangwei Wang, Luna K. Qiu et al., arXiv 2610.39905 (2026-10-29). Implemented
as a feature within **Huabu** (microsoft/Huabu, open-source spatial workspace).

**[paper]** Formative study (8 participants, pen-first prototype) surfaced the need for
**cumulative agent assistance** — users revisit/reorganize materials and build on prior
results — and that **selections and spatial marks delimit** what the agent should use and
where results should appear. Users wanted to **inspect and correct the agent's
interpretation** and stop unwanted actions. Three connected activities: **bringing
materials in / thinking with materials / shaping the space**.

**[paper]** Inkitiate design: each task begins with **explicit ink submission** (+ selected
canvas objects), interpreted with **bounded spatial context** and relevant prior history;
execution exposes the agent's understanding, included materials, progress; users answer
clarification questions (suggested options or more ink) or abort; results are **written
back as persistent, editable objects** reusable in subsequent ink queries. Study (N=18):
favorable usability, low workload; retained ink/materials were reused for further queries;
difficulties addressing local targets; output form matters for downstream work. An
**ink-query vocabulary** characterizes how linguistic + referential + spatial marks combine.

**[ours]** This is the concrete answer to "local vs global context": **selection + spatial
relation is a context boundary expression** — a user-side, gesture-native way to assemble
what GSC calls a Context. "Explicit submission" mirrors GSC's governance: nothing runs
without a deliberate act. "Results as persistent editable objects" matches GSC's
Chunk/Object lifecycle. The observed difficulty "addressing local targets" is a real
design risk for any spatial interface. Beyond ink: the generalizable idea is *situated
deictic context selection* (this + near-this + marks), which could apply to lists and
tables too.

---

## 6. Cross-dimension synthesis (not five summaries — how they combine)

### Dimension map

| Dimension | Core insight | Evidence | Limitations | Product implications | Cross-project | Unresolved |
|---|---|---|---|---|---|---|
| **Representation** (D) | The organization of units+relations is the working object; roles develop in use | 58-paper survey + 3-month study [abstract] | R1/R2/R3 unseen; 7 users | Don't design representations fully upfront; support reorganization explicitly | GSC clusters/contexts; Thylas boards; Lemma knowledge structures | When does a representation persist? (Q-E) |
| **Situated Interaction** (E) | Selection + spatial/marks bound the task context; explicit submission governs | 8+18 participant studies [partial] | Ink-specific; "local targeting" difficulties | Context assembly via direct manipulation, not forms | GSC Context building; Thylas canvas; Lemma study space | Does spatial carry semantics or just proximity? (Q-C) |
| **Mutual Awareness** (A) | Engagement traces attached to work objects, visible to humans and readable by agents | 18-researcher study [abstract] | Trace granularity unknown | Provenance as interaction surface; bidirectional traces | GSC events/provenance; Thylas run views; Lemma learning journal | Trace schema; privacy/visibility (open) |
| **Concurrent Collaboration** (B) | Attribution of concurrent edits is the pivot; visibility without attribution creates conflicts | 2 probes, N=10+10/12 [partial full-text] | One domain (Figma design); version-dependent figures | Edit-level attribution vocabulary; pattern-specific agent responses | GSC SemTag extension; Thylas co-editing; Lemma agent-revised explanations | Ownership of edit semantics per project |
| **Process & Infrastructure** (C) | Process as explicit, inspectable representation; structural adaptation; UI decoupled from process | Conceptual + analysis of paradigms [partial] | Overhead risks; unvalidated longitudinally | Process Layer worth considering *as representation*, not workflow engine | GSC events vs process; Thylas run views; Lemma learning paths | Process first-class or derived? (Q-D) |

### Interactions between dimensions (emergent ideas)

1. **Situated interaction × Representation (E×D):** If selection and marks *are* how users
   express context boundaries, then a Work Representation should natively record
   *selections as first-class sub-structures* (not just objects and relations). **[ours]**
   GSC's Context membership could gain "why selected / by which gesture" metadata.
2. **Mutual awareness × Provenance (A×D/C):** If representation roles develop in use,
   the *history of reorganization* is itself collaboration history. Traces should attach
   not only to content edits but to **structural moves** (grouping, regrouping, pinning).
   **[ours]** GSC events currently capture CRUD-ish facts; structural-move events would
   close this gap.
3. **Concurrent editing × Persistence (B×D):** CLEO's intermediate-result appropriation
   means *partial outputs are durable units* — i.e., the persistence boundary must include
   intermediate representations, or users lose reused work. Tension with "temporary
   working representations" (see 03, Q-E).
4. **Process history × Context retrieval (C×A):** Process traces (C) + engagement traces
   (A) together are what a future agent needs to "build on earlier work" — this is
   essentially GSC's evolvable-context thesis, restated at the collaboration level.
5. **Spatial organization × semantic relationships (E×D):** Spatial proximity may be
   *intent*, but the evidence (local-targeting difficulties) warns against encoding
   semantics purely spatially. **[ours]** Keep spatial hints as soft metadata; keep
   semantic relations explicit (GSC's `relations` table stays authoritative).

### Combined insight not visible in any single paper

**[ours]** The five directions collectively define a loop:

> **Represent** (D) → **Manipulate in place** (E) → **Attribute concurrent changes** (B) →
> **Make activity mutually visible** (A) → **Reflect and adapt structure** (C) → back.

Each paper solves one arc well and assumes the others. A "Malleable Context Space" is
precisely the claim that this loop should be *one coherent substrate* instead of five
product features. The design risk is over-structuring (C's own warning) — the substrate
must degrade gracefully to plain lists and chat for trivial work.

## 7. Research limitations (explicit)

- A and D are **abstract-level**; do not cite their internals (incl. D's R1/R2/R3).
- B figures differ across versions (N=10/214 vs 12/255); patterns more reliable than rates.
- C is a conceptual framework paper — no longitudinal validation yet.
- E is ink-in-spatial-workspace specific; generalization beyond canvas is our extrapolation.
- No paper covers cross-workspace governance (GSC/Thylas territory) — our gap to fill.
