# 10 — Glossary (cross-project terminology)

> Rule (task §10): if terms have different meanings in different projects, **document the
> distinction** instead of forcing identical definitions. "Shared" = we recommend one
> consistent definition; "Divergent" = keep separate, document mapping.

## Core terms

### Information Object — **Shared definition candidate**
A persistent, addressable unit of information with identity, type, provenance and
lifecycle. GSC implements it as items (`raw.*` = Raw Information, `object.*` = Structured
Object). Other projects may implement differently as long as: stable addressability,
provenance retained, lifecycle explicit.
- Related: Knowledge Object, Artifact (below).

### Knowledge Object — **Divergent**
- GSC: informal synonym for Structured Object (semantic unit like Concept/Decision).
- Lemma: potentially a *learner's* knowledge construct (their understanding), which is
  NOT the same as an information object. **Do not merge these meanings** — this is exactly
  the tension in open question 32.

### Artifact — **Divergent (Thylas-owned term)**
Thylas: persistent, addressable, evolvable asset with **authority, version history and
pinned canonical references** ("one canonical artifact, one authority, many references;
local work on local objects; agreement through proposals" — CANONICAL-REUSE.md).
- vs GSC Information Object: GSC has provenance + supersede chains but no version pinning
  or authority model. Mapping candidate (NOT decided): Artifact ≈ governed Structured
  Object + version policy. See 07 §4-C1.

### Resource — **Divergent**
- Thylas: Workspace resources (materials available in a workspace).
- Infrastructure sense: external assets (files, datasets) in C's Environment module.
- Recommendation: always qualify ("Workspace resource", "Environment resource").

### Context — **Divergent by scope, shared shape**
- GSC (**canonical sense**): an explicitly assembled, purpose-specific information view
  (subject/scope/purpose + explicit members); does NOT duplicate underlying information;
  exportable to agents (`buildAgentContext`).
- Transient sense (E/Inkitiate): the bounded local context of a task (selection + nearby
  materials + marks) — "what the agent should use".
- WAM Shared Context: task-level runtime context (boundary: runtime, not persistent).
- Recommendation: keep all three senses; qualify as "persistent Context (GSC)",
  "task context (local)", "WAM shared context (runtime)".

### Context Entry — **Shared definition candidate**
A membership record: object X referenced in Context C, with optional metadata (why
selected, by whom, when). GSC has `context_members`; E evidence suggests selection
provenance should ride along (02 §2).

### Work Representation — **Shared definition candidate (from D)**
The organization of units and relations (plus arrangement/annotations) that humans and
agents form and revise to advance work. Not the information itself, not the UI, not the
storage. Instances: GSC Cluster/Context (persistent forms), Thylas boards, Lemma
knowledge structures, any spatial arrangement.

### View — **Shared definition candidate**
A projection of information and/or a working representation (density, modality, ordering,
filters). A view is NOT a data model and needs no storage of its own (except saved
parameters). Per C: "the same underlying process may be projected as a conversational
exchange, a workflow diagram, a timeline, or a spatial workspace."

### Workspace — **Divergent (Thylas-owned term)**
Thylas: the organizing unit of working environment (tenancy, resources, Coworkers).
- GSC deliberately has no Workspace concept (it is cross-Workspace infrastructure).
- C's "Environment" module ≈ workspace contents. Lemma's "Space" ≈ learning workspace.
- Do not use "workspace" unqualified in cross-project docs.

### Spatial Workspace — **Divergent (open, Q-C)**
- E/Huabu: a canvas-like environment where ink, selection, and arrangement are the
  interaction medium.
- Task warning: do NOT equate with "infinite canvas" — the semantic operations
  (bring materials in / think with / shape the space) matter, not the zoomable surface.
- Status debate: view vs environment vs hybrid (08-C).

### Process — **Shared definition candidate (from C)**
An explicit representation of ongoing activity: Problem Space / Workflow / Operations /
Environment / Reflection. **Status: NOT implemented in any of the three projects as such**
(GSC has process-as-history; Thylas has run views; Lemma has learning workflows). See 05.

### Activity — **Divergent; avoid unqualified**
Suggest replacing with: **Event** (recorded fact), **Engagement** (participant's
interaction with an object — A/Ream sense), or **Operation** (available action). "Activity"
is overloaded across GSC activity map, C's "collaborative activity", Lemma learning
activities.

### Event — **Shared definition candidate**
An immutable fact record (who/what/when/why) about an object or representation. GSC
`events` table. Derived views (timelines, histories) compute from events.

### Provenance — **Shared definition candidate**
The record of where information came from and how it changed: origin (user/agent/import),
source attribution, transformation history, confirmation state. GSC canonical definition
(INFORMATION_MODEL + SemTag original/confirmed/machine/alert). A [paper, abstract]
extends the concept to *engagement* provenance (who engaged, how) — proposal, not
current decision.

### Evidence — **Divergent**
- GSC: `raw.evidence` (an original datum with `locator`) and `object.evidencereference`
  (a claim pointing at a source).
- Lemma: assessment evidence for mastery (learning-qualified).
- Everyday sense: "evidence on demand" (06 §5) = drill-in traces/rationale.
- Always qualify when cross-project.

## Protocol terms

### Proposal / Confirmation — **Shared definition candidate (strongest)**
The agreement protocol: a machine (or peer) produces a **proposal** (suggested content,
name, classification, or structural change); a human **confirms** (accept/reject/defer)
before it becomes authoritative. Independently present in GSC (`proposals`, D-042) and
Thylas (CANONICAL-REUSE "agreement happens through proposals"). Recommended as the
canonical shared primitive.

### Attribution — **Shared definition candidate (from B)**
The record of which participant (human/agent) performed which edit and with what intent
class (feedback / independent work / co-edit / takeover / reuse). Currently missing at
edit level in all three projects (GSC covers origin level only).

### Canonical / Kept / Scratch — **proposal vocabulary (03 §4)**
Persistence tiers for representations: canonical (shared, governed), kept (user-pinned,
private/semi), scratch (auto-expiring). Exploratory — not yet any project's terminology.

## Deliberately excluded from sharing
- Chunk (GSC pipeline term), Coworker/Workspace (Thylas), mastery/misconception/Socratic
  turn (Lemma), WAM runtime terms (WAM-owned).
