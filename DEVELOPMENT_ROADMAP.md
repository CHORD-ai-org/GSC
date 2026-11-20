# DEVELOPMENT_ROADMAP.md — Executable Roadmap

Maintained: 2026-11-16. Source of truth for phase order and verification. Do not skip or reorder silently; record reasons in `DECISION_LOG.md` and wait for confirmation.

## 1. Phase overview

| Phase | Goal | Deliverables | Depends on | Verification | Main risks | Open questions | Status |
|---|---|---|---|---|---|---|---|
| 00 — Repo inspection & foundation | Inspect GSC + Thylas, establish docs, minimum stack | `README`, `AGENTS`, `THINKING`, `PROJECT_CONTEXT`, `PRODUCT_VISION`, `DESIGN_BOUNDARIES`, `INFORMATION_MODEL` (draft), `THYLAS_REFERENCE`, `DEVELOPMENT_ROADMAP`, `IMPLEMENTATION_STATUS`, `DECISION_LOG`, `KNOWN_ISSUES` | Access to both repos | Both repos inspected; all claims have paths; no code written; stack proposal recorded | Fabricating Thylas facts; jumping into implementation | D-004 local DB; D-005 stack; D-010 UI placement | **COMPLETE — reviewed 2026-11-16** |
| 01 — Information model & taxonomy | Reduce proposed model to smallest useful set | Final `INFORMATION_MODEL.md`, `RAW_INFORMATION_TAXONOMY.md`, `STRUCTURED_OBJECT_TAXONOMY.md`, `RELATIONSHIP_MODEL.md` | Phase 00 review; D-005 | Every type maps to ≥1 scenario A–D; no type without a user action; statuses labelled | Ontology explosion; turning concepts into schema too early | none blocking; display details moved to Phase 02 | **COMPLETE — 2026-11-16** |
| 02 — MVP interaction design | Define real workflows and UI, not a dashboard | `MVP_USER_FLOWS.md`, `MVP_UI_SPECIFICATION.md`, UI prototype | Phase 01 complete; D-004/D-005/D-010 decided | 8 required workflows described screen-by-screen; prototype renders; section pattern matches Thylas | Decorative UI; building a dashboard; embedding in Thylas too early | none blocking | **COMPLETE — 2026-11-16** |
| 03 — GSC core implementation | Smallest independently functional GSC | Runnable prototype, persistence, validation, tests, updated technical docs | Phase 02 approved; D-022…D-025 approval | Build passes; CRUD + relationship + provenance tests pass; data survives restart | Giant JSONB; scope creep; local DB setup | none blocking; Docker deferred via D-026 | **COMPLETE — 2026-11-18** |
| 04 — Context views | Demonstrate explicitly assembled Context | Basic context organization, context inspection UI, Context Space vs View doc | Phase 03 working | Knowledge Context assembled from existing objects; no dynamic retrieval added | Slipping into retrieval engine or permission system | none blocking | **COMPLETE — 2026-11-19** |
| 05 — UI shell & interaction layer | Replace the dark shell with the designed light shell and new surfaces | `PHASE_05_UI_PLAN.md`, `ui-prototype/refs/`, light shell, Overview+Composer, Canvas, Sync export, Settings (animation quality), animations | Phase 04 working; user screenshots 2026-11-19 | check/test/build/api:check pass; screenshots of shell, composer, canvas, settings; prefs persist | Restyle breaking existing views; animation cost | Q1 canvas entry; Q2 sync placement (see plan §7) | **IN PROGRESS — 2026-11-19 (D-030)** |
| 06 — Evaluation & integration prep | Prove intended value; prepare Thylas boundary | `MVP_EVALUATION.md`, known limitations, integration requirements | Phase 05 working | Scenarios A–D executed and recorded; five evaluation questions answered; no full Thylas integration | Claiming success without executed scenarios | integration contract shape | **PROPOSED — not started** |

Phase 03 detailed execution plan: `PHASE_03_PLAN.md` (P3-0…P3-11, dependencies, verification matrix, risks, open questions). All P3-0…P3-11 completed 2026-11-18; results in `IMPLEMENTATION_STATUS.md`.

Phase 04 task cards: `PHASE_04_PLAN.md`. All P4-0…P4-4 completed 2026-11-19.

Phase 05 task cards: `PHASE_05_UI_PLAN.md` (P5-0…P5-6 + milestones M1–M6). Former Phase 05 (evaluation) renumbered to Phase 06 per D-030.

Long-range tracks (2026-11-20, `plans/`): PLAN-1…PLAN-7 executed (D-042…D-063); PLAN-8 (Meta Tags + User Profile) in progress (D-064…D-066); UI layout update: `UI_LAYOUT_PLAN.md` (L1–L6, executed 2026-11-19).

## 2. Phase 01 task cards

Each card: purpose / scope / interacts with / does not own / user flow / minimum implementation / test.

All P1-1 to P1-5 cards completed 2026-11-16. Evidence: four final documents in the repository; `IMPLEMENTATION_STATUS.md`.

### P1-1 Finalize object set and status vocabulary

- **Purpose:** fix the smallest object set that can prove the hybrid model.
- **Scope:** Concept, Hypothesis, Methodology, Decision, EvidenceReference; status vocabulary.
- **Interacts with:** `INFORMATION_MODEL.md`, `PRODUCT_VISION.md`, scenarios A–D.
- **Does not own:** DB tables, API shapes, UI.
- **User flow:** review proposed types → map each to a scenario → cut unsupported types → record status per type.
- **Minimum:** updated `INFORMATION_MODEL.md` with a type/status table; no new files.
- **Test:** each scenario has all types it needs; every retained type has a concrete user action.

### P1-2 Raw information taxonomy

- **Purpose:** define what "original information" means in the MVP.
- **Scope:** Document, Message, Evidence, FileContent; required metadata.
- **Interacts with:** P1-1, P1-5.
- **Does not own:** file storage engine, parsers, import pipeline.
- **User flow:** user pastes text or imports a file → item gets id, type, source, timestamps → item appears in browse list.
- **Minimum:** `RAW_INFORMATION_TAXONOMY.md` with type table + required fields.
- **Test:** Scenario A paper import and Scenario C source preservation expressible with these types.

### P1-3 Structured object taxonomy

- **Purpose:** define fields and meaning of each addressable semantic object.
- **Scope:** five types from P1-1, their core content fields.
- **Interacts with:** P1-1, P1-4, P1-5.
- **Does not own:** trust levels, verification status, automatic extraction.
- **User flow:** user creates object by type → fills core fields → saves with stable id → reopens detail.
- **Minimum:** `STRUCTURED_OBJECT_TAXONOMY.md`.
- **Test:** Scenario B (Concept + Methodology) and Scenario C (Decision with reasoning/alternatives/consequences) fully expressible.

### P1-4 Relationship model

- **Purpose:** define provenance and object-to-object links without a graph engine.
- **Scope:** `derived_from`, `references`, `related_to`; evaluate `supports` / `challenges`.
- **Interacts with:** P1-2, P1-3.
- **Does not own:** inference, traversal algorithms, graph DB.
- **User flow:** user opens object → picks "attach source" or "link object" → selects target → sees link in detail.
- **Minimum:** `RELATIONSHIP_MODEL.md` with kind, endpoints, direction, display rule.
- **Test:** Scenario A (Hypothesis + Concept → paper) and Scenario B (Concept ↔ Methodology) expressible.

### P1-5 Provenance and modification history baseline

- **Purpose:** make origin and change traceable without a governance system.
- **Scope:** shared metadata fields; one history-event shape.
- **Interacts with:** all Phase 01 docs.
- **Does not own:** permissions, conflict resolution, approvals.
- **User flow:** user views object detail → reads source, origin, created/updated → reads short change list.
- **Minimum:** metadata + history section in `INFORMATION_MODEL.md`.
- **Test:** a create → edit sequence can be reconstructed from stored fields.

## 3. Phase 02 task cards

All P2-0 to P2-6 cards completed 2026-11-16. Evidence: `MVP_USER_FLOWS.md`, `MVP_UI_SPECIFICATION.md`, `ui-prototype/index.html`, `IMPLEMENTATION_STATUS.md`.

### P2-0 Navigation and interaction hierarchy

- **Purpose:** decide how a user moves through GSC.
- **Scope:** one primary list view, one detail view, explicit create action; no dashboard.
- **Interacts with:** Phase 01 types; Thylas section pattern from `THYLAS_REFERENCE.md` §4.
- **Does not own:** Thylas Overview, global shell, tabs.
- **User flow:** open app → browse list → filter by type → open detail → create/edit/link.
- **Minimum:** one navigation diagram + screen inventory in `MVP_UI_SPECIFICATION.md`.
- **Test:** every Phase 01 user action reachable in ≤3 steps.

### P2-1 Create raw information

- **Purpose:** preserve original material.
- **Scope:** paste text or import a text file; source field.
- **Interacts with:** `RAW_INFORMATION_TAXONOMY.md`.
- **Does not own:** OCR, binary parsing, auto-summarization.
- **User flow:** click New raw item → choose type → paste/select file → add source label → save.
- **Minimum:** one form, one saved-item row.
- **Test:** saved item reopens with unchanged content and source.

### P2-2 Create structured object and attach source

- **Purpose:** turn identified meaning into an addressable object with provenance.
- **Scope:** five object types; optional source attachment at creation.
- **Interacts with:** P1-3, P1-4, P2-1.
- **Does not own:** automatic extraction, validation, AI calls.
- **User flow:** New object → choose type → fill fields → pick raw item → save → detail shows source link.
- **Minimum:** one form + source picker.
- **Test:** Scenario A Hypothesis and Concept both point back to the imported paper.

### P2-3 Connect objects to each other

- **Purpose:** make relationships visible and inspectable.
- **Scope:** typed relation picker between two objects.
- **Interacts with:** `RELATIONSHIP_MODEL.md`.
- **Does not own:** graph rendering, transitive inference.
- **User flow:** detail → Link object → pick target + relation → save → both details show relation.
- **Minimum:** one relation form, two-sided display.
- **Test:** Scenario B relations visible from both ends.

### P2-4 Browse and filter

- **Purpose:** let users see what exists.
- **Scope:** list by type/domain, compact rows, empty state.
- **Interacts with:** all stored items.
- **Does not own:** search index, semantic retrieval, pagination framework.
- **User flow:** open list → filter → scan rows → open detail.
- **Minimum:** type filter + simple keyword filter if cheap.
- **Test:** user can locate a specific item created in P2-1/P2-2.

### P2-5 Inspect provenance and history

- **Purpose:** answer "where did this come from / what changed".
- **Scope:** source link, origin, timestamps, short event list.
- **Interacts with:** P1-5.
- **Does not own:** diff viewer, audit policy.
- **User flow:** detail → provenance section → open source; detail → history section.
- **Minimum:** two read-only sections in detail.
- **Test:** Scenario C decision reasoning and sources readable without opening raw chat.

### P2-6 Edit and update information

- **Purpose:** support evolution with traceability.
- **Scope:** edit core fields and notes; record one history event.
- **Interacts with:** P1-5, P2-5.
- **Does not own:** merge/conflict resolution, auto-versioning UI.
- **User flow:** detail → Edit → change fields → save → history shows the update.
- **Minimum:** inline edit form + history append.
- **Test:** update does not overwrite source or relationship fields.

## 4. Verification standard for later phases

- `npm run build` / `npm run check` equivalent passes after any code phase.
- Tests run and result recorded in `IMPLEMENTATION_STATUS.md` with command and count.
- Each scenario A–D executed once in Phase 05 with observed results, not intended results.
- Any unresolved item goes to `KNOWN_ISSUES.md`, never into "Completed".

## 5. Change control

Adjustments must be entered in `DECISION_LOG.md` with reason, alternatives, consequences, status, date. Wait for confirmation before executing a changed phase order or scope.
