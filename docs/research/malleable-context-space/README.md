# Malleable Context Space — Cross-Project Research (GSC × Thylas × Lemma AI)

> Status: **research exploration** — for the founder-led brainstorming session.
> This is NOT an approved architecture or product decision. "Malleable Context Space" is a
> tentative direction name, not an approved product name.
> Produced 2026-11-21 by the GSC agent (one of three project-specific agents; see §6).

## 1. Why this research exists

Three projects in the ecosystem are circling the same problem from different angles:

- **GSC** (Global Shared Context) — persistent context infrastructure: information that
  outlives interactions, structured and addressable, governed and evolvable.
- **Thylas** — the human-facing environment: Users, Workspaces, Coworkers, Artifacts;
  continuous human-agent collaboration beyond chat.
- **Lemma AI** — long-term learning and cognitive growth: "学习不是获取，是长出结构"
  (learning is growing structure, not acquisition); growth happens *between* requests.

All three need answers to the same underlying questions: what is a working representation,
how do humans and agents jointly manipulate it, how does work persist and evolve, and how do
we present the same information in different ways. This research investigates whether a
shared conceptual foundation ("Malleable Context Space") could serve CHORD and Lemma
**without forcing identical products, taxonomies, or databases**.

## 2. Relationship between the three projects (working hypothesis, not decision)

```text
                    Shared Design Foundation
                  (Research / Concepts / Models)
                              |
               +--------------+--------------+
               |                             |
        CHORD / GSC                       Lemma AI
               |
           Thylas
               |
        Human-Agent UX
```

- GSC provides persistent context infrastructure (independently evolvable).
- Thylas provides the human-facing environment (Coworkers / Workspaces / Artifacts).
- Lemma provides a learning-oriented environment (cognitive growth domain model).
- **Open**: whether Lemma depends on GSC at all — the research treats this as undecided.
- Established boundary (preserved): GSC ≠ WAM runtime state; Thylas does not own GSC's
  infrastructure; Lemma must not become "just a GSC interface".

## 3. The five research directions

| # | Direction | Paper | Evidence level here |
|---|---|---|---|
| A | Ream — mutual awareness via engagement traces | *Ream: Unfolding Mutual Awareness in Human-Agent Workspaces* (UCSD/AI2/UW, arXiv 2610.09497) | **abstract-level** |
| B | CLEO — concurrent human-agent editing & attribution | *"When to Hand Off, When to Work Together"* (arXiv 2603.02050) | **partial full-text** |
| C | Interaction / Process / Infrastructure | *Interaction, Process, Infrastructure: A Unified Framework for Human-Agent Collaboration* (arXiv 2506.11718, Microsoft Research) | **partial full-text** |
| D | Working Through Representation / Malleable Workspace | *Working Through Representation: Malleable Workspaces for Human-Agent Knowledge Work* (MSRA/Tongji/CataX, arXiv 2610.30893) | **abstract-level** |
| E | Inkitiate — ink-initiated, situated agent assistance | *Inkitiate: Initiating and Steering Agent Assistance through Ink in a Spatial Workspace* (arXiv 2610.39905; implemented inside **Huabu**, microsoft/Huabu) | **partial full-text** |

Evidence discipline: every claim in the synthesis is labelled as **[paper]** (finding stated
by the paper at the inspected level) or **[ours]** (our interpretation/product implication).
R1/R2/R3 from Research D could not be inspected (abstract only) — recorded as a limitation.

## 4. What has been established (within this research)

**Founder decision (2026-11-22):** GSC will include **multiple views** — with both the
Ream "feel" (mutual-awareness traces localized on work objects, readable both ways) and
the Huabu "feel" (spatial workbench: selection/ink/arrangement, selection-as-context-
boundary). This leans Q-A toward the multi-view end and gives the spatial view real
standing (see 04/09); implementation discipline unchanged (View = projection; spatial ≠
infinite canvas).

- The five directions converge on **the working representation as the substrate** of
  human-agent collaboration (see `01-research-synthesis.md`).
- **Attribution of concurrent edits** (who changed what, and was it feedback?) is the
  pivot capability CLEO's study identified as missing; GSC's provenance/SemTag vocabulary
  is a partial precursor at object level (see `06-human-agent-interaction.md`).
- Thylas' canonical-reuse rule ("one canonical artifact, one authority, many references;
  agreement through proposals") and GSC's proposal→confirmation model are **the same
  protocol pattern** — a concrete shared-primitive candidate.
- Process-as-first-class (Research C) vs process-as-event-history is **open** — see
  `05-process-model-exploration.md` and `08-architectural-alternatives.md`.

## 5. What remains exploratory

Almost everything at the architectural level. In particular the four conceptual models
(information / representation / view / process), the persistence boundary of temporary
representations, static-vs-dynamic views and classification, spatial-workspace status,
and the CHORD↔Lemma sharing strategy (concept only? spec? SDK?) — all open, listed in
`09-open-questions.md` with founder-discussion flags.

## 6. Document index

| File | Content |
|---|---|
| `01-research-synthesis.md` | Five directions, evidence levels, cross-dimension synthesis |
| `02-information-model-exploration.md` | Persistent information; multidimensional classification |
| `03-representation-model-exploration.md` | Working representations; temporary vs persistent |
| `04-view-model-exploration.md` | View modes; View ≠ Representation |
| `05-process-model-exploration.md` | Process model; first-class vs event-derived |
| `06-human-agent-interaction.md` | Direct manipulation, conversation, bidirectional editing, awareness, cognitive load |
| `07-cross-project-application.md` | Capability matrix × 3 projects; scenarios A/B/C; shared-vs-local conclusions |
| `08-architectural-alternatives.md` | 2–3 alternatives per major question |
| `09-open-questions.md` | Classified open questions; founder flags |
| `10-glossary.md` | Terminology across the three projects |

## 7. Cross-agent coordination note (§10 of the task)

This GSC-side document set includes (in `07`): project-specific findings, cross-project
findings, potential conflicts with existing decisions, shared vs domain-specific concept
split, and questions for the Thylas and Lemma agents. Verified vs briefing-supplied
information is marked where relevant (this agent inspected GSC and Thylas repositories
directly; Lemma AI repository at `D:\github projects\lemma-ai` was partially inspected —
product philosophy from `docs/design/pitch-deck/narrative-diagnosis.md` and docs structure;
the Lemma domain model here relies partly on the supplied project briefing).

**Local paths used (shared research index anchors):**
- GSC: `PRODUCT_VISION.md`, `INFORMATION_MODEL.md`, `PROJECT_CONTEXT.md`,
  `DECISION_LOG.md`, `server/persistence/schema.ts`
- Thylas: `docs/product/gsc/MANIFESTO.md`, `docs/product/definition.md`,
  `docs/product/artifacts/` (DEFINITION, CANONICAL-REUSE, GOVERNANCE, LIFECYCLE)
- Lemma: `docs/design/pitch-deck/narrative-diagnosis.md`, `docs/design/` (partial)
- Papers: arXiv 2610.09497 (A), 2603.02050 (B), 2506.11718 (C), 2610.30893 (D), 2610.39905 (E)
