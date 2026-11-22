# 02 — Information Model Exploration

> Question: **what persistent information exists?** Exploration for brainstorming —
> not a schema. GSC's existing `INFORMATION_MODEL.md` (DECIDED) remains the source of
> truth and is **preserved** below; we only explore where it would extend if the
> Malleable Context Space direction is adopted.

## 1. What GSC already decides (preserved — do not reopen without cause)

From `INFORMATION_MODEL.md` + `PROJECT_CONTEXT.md` (verified in repo):

- **Hybrid model**: Raw Information (Document/Message/Evidence/FileContent — original
  preserved with source) + Structured Objects (Concept/Hypothesis/Methodology/Decision/
  EvidenceReference — independently addressable semantic identity).
- Rules already fixed: objects may be `derived_from` raw, `references` it, or be free
  standing; not everything is extracted; **no forced extraction pipeline** (MVP).
- Three-level model (Chunk / Object / Collection-ish levels per the doc) and relation
  semantics in `RELATIONSHIP_MODEL.md` (derived_from / references / related_to / supports /
  challenges / superseded_by).
- **Provenance & authority**: `origin` (user/agent/import), `source_label`, machine
  products are **proposals until human confirmation** (D-042); SemTag
  original/confirmed/machine/alert vocabulary (D-055) — color + text, never color alone.
- Lifecycle: status vocabulary (`draft/active/superseded/outdated`), soft delete +
  trash + purge, owner scoping (0011 migration), tag model (controlled dimension ×
  free value × explicit scope).
- Gaps registered (verified): semantic/vector retrieval excluded (GAP-14); context
  granularity authorization (GAP-15) open.

**[ours] Conflict check with research:** the Malleable Workspace survey finding that
systems rarely support "consequential agent-driven changes beyond the representation"
(D) *validates* GSC's proposals-only governance. Nothing in the five directions requires
us to reopen the hybrid model.

## 2. Objects, attributes, relations — extension candidates

| Element | GSC today | Candidate extension | Why (evidence) | Caution |
|---|---|---|---|---|
| Object identity | stable ids, semantic names | — | already sufficient | don't add "representation objects" blindly |
| Relations | typed, directed edges + note | **structural-move events** (group/ungroup/pin/regroup) recorded as events, not new entities | A×D synthesis: reorganization history is collaboration history | record as events first; only promote to entity if queries demand |
| Sources | source_label + web snapshots (0010) | engagement/read traces per participant | Ream [paper, abstract]: traces within documents, agent-readable | privacy & retention policy needed (open) |
| Evidence | raw.evidence + locator | selection provenance ("selected by gesture X at time T") | Inkitiate [paper]: selection delimits task context | keep as metadata on membership, not a new table |
| Versions | superseded / superseded_by relation | artifact-style pinned versions (Thylas model) | Thylas CANONICAL-REUSE [repo]: pinned v3 references | two models conflict → see conflicts (07) |
| Ownership | owner_id + cluster shares (view/add) | role vocabulary for co-editing (who may edit vs propose) | B [paper]: attribution needs actor roles | reuse share roles; don't invent new ACL system |
| Scope | tags scope + contexts | local (selection) vs global (discoverable) context scope | E [paper]: bounded spatial context | Context already is the explicit scope — extend metadata only |

## 3. Classification: multidimensional, not a tree

The task proposes dimensions. Status per dimension (**[ours]** assessments):

| Dimension | Nature today (GSC) | Proposal |
|---|---|---|
| **Object Type** | controlled vocabulary (raw.*/object.*) | keep as **controlled**; slow-changing core |
| **Semantic Role** | implicitly = type | keep implicit for now; roles "develop in use" (D) — do not pre-enumerate |
| **Provenance** | origin enum + source_label | keep as **metadata + events** |
| **Lifecycle** | status enum | keep **controlled** (governance-critical) |
| **Scope** | tags scope + contexts | keep; contexts are the explicit scope structure |
| **Relationships** | relation kinds | keep **controlled kinds**, free-form notes |
| **Domain** | `domain` field (free-ish) | open: controlled vocabulary vs free — founder input |

Design rule carried from the quality bar: **classification dimensions are mostly
metadata + controlled vocabularies where governance matters (type, lifecycle, relation
kind); they are NOT independent semantic structures** unless a query workload proves
otherwise. This avoids taxonomy explosion (the recorded failure mode of Phase 01:
"Ontology explosion; turning concepts into schema too early").

**Dynamic classification (Q-B)**: GSC's answer so far = users introduce *values* (tags:
controlled dimension, free value), not *dimensions*; agents propose (proposals). The
research doesn't force a change; Inkitiate's ink-query vocabulary [paper] shows users
invent expressive "vocabularies" in use — supporting **user-driven value creation within
stable dimensions** as the middle path.

## 4. Cross-project mapping (see 07 for the full matrix)

- **Information Object** (GSC) ⊇ **Artifact** (Thylas)? Not identical: Thylas Artifacts
  have authority + pinned versions + local reference objects (CANONICAL-REUSE.md [repo]).
  GSC items have provenance + supersede chains. Mapping candidate: Artifact ≈ GSC
  Structured Object **plus** a version-pinning policy. **This is a real difference —
  document, don't merge** (see 07 conflicts).
- **Lemma learning objects** (concepts, misconceptions, mastery evidence): the *concept*
  type could map to GSC `object.concept`, but **mastery/cognitive state must NOT** — it is
  learner-specific evolution data, not shared information (Lemma domain).

## 5. Open information-model questions → 09

- Engagement traces schema (what granularity? who can read?) — cross-project.
- Edit-level attribution storage (CLEO) — events vs entities.
- Domain field governance (controlled vs free).
- Version pinning vs supersede chains (GSC↔Thylas reconciliation).
