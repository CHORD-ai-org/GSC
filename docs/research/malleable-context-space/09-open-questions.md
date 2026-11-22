# 09 — Open Questions

> Classified per task §8. **[founder]** marks decisions that need the founder-led
> brainstorming session. Derived from 01–08; cross-referenced there.

## Conceptual

1. **[founder]** Is "Malleable Context Space" a foundation-layer claim (shared substrate)
   or a design-language claim (shared principles only)? — determines Q-F.
2. Is a Work Representation fundamentally different from a Workspace? (D treats Work
   Environment and Work Representation as distinct; Thylas Workspace mixes both.)
3. Should "representation roles develop in use" (D) mean we design *no* canonical
   structure early, or that canonical structure is user-promoted only? (→ Q-E)
4. **[founder]** Do we accept C's claim that Process must be first-class for long-horizon
   collaboration, despite overhead? (→ Q-D)

## Product

5. **[founder]** Which Scenario (A/B/C) gets the Malleable treatment *first*? (All three
   at once = sprawl.)
6. What is the smallest visible feature that tests the shared primitives — e.g.
   "select N items → ask Coworker → results as proposals" in GSC?
7. Should engagement traces be user-visible by default (Ream) or drill-in only?
8. **[founder]** Does Lemma want ANY dependency on shared infrastructure in v-next, or
   pure concept alignment? (→ Q-F)

## Information Model

9. Edit-level attribution record schema (actor/action/intent-class/scope) — events vs
   entity? (02 §2, 06 §3)
10. Engagement trace granularity (per read? per edit? per annotation?) and retention.
11. Domain field governance: controlled vocabulary or free? (02 §3)
12. **[founder]** Artifact-versioning (pin, authority) vs GSC supersede-chains —
    unify, map, or keep both? (07 §4-C1)
13. Do selection provenance ("selected by gesture") and spatial-adjacency hints live in
    representation records or events?

## Interaction

14. Intent-class inference vs declaration for concurrent edits (08-G).
15. How are agent structural-reorganization *proposals* rendered and accepted?
    (D: reorganization is the rare capability — treat carefully.)
16. Clarification UX: suggested options (E) vs open questions — per project?
17. How does "delegate with selection" express scope — frozen snapshot vs live set?
18. Addressing local targets in spatial UI (E's observed difficulty) — selection
    handles? named regions?

## Architecture

19. **[founder]** Q-D: process first-class / derived / hybrid (08-D).
20. **[founder]** Q-E: persistence ladder adoption + scratch TTL (08-E).
21. **[founder]** Q-C: spatial = view / environment / hybrid (08-C).
22. Q-A resolution: which views save, and where (08-A)?
23. Where do kept representations live — GSC? per-app? (cross-project!)

## Technical

24. Trace/event write overhead and query patterns (timeline views need indexed reads).
25. If representations reference objects across projects, identity/addressing scheme
    (GSC ids are stable; Thylas artifact ids; Lemma ids) — export/import mapping.
26. Permission overlays on views over shared representations (GAP-15 adjacency).
27. Does the agreement protocol need idempotent, auditable state transitions shared as
    spec (Q-F2) — GSC `proposals` is one impl.

## Cross-project

28. **[founder]** Q-F: concepts / spec / SDK (08-F).
29. Terminology lock (10-glossary) — three agents must not fork "Representation/View/
    Process/Artifact" definitions; disagreements documented as alternatives.
30. WAM boundary: process traces (C) vs WAM runtime state — where exactly is the line?
    (Existing principle says GSC ≠ WAM runtime; process-as-first-class may blur it.)
31. How do Thylas Coworkers *consume* GSC contexts — direct, WAM-mediated, or exported
    packages? (question for Thylas agent)
32. Is Lemma's concept graph a representation-of-understanding or governed information?
    (question for Lemma agent — changes everything about its reorganization semantics.)
