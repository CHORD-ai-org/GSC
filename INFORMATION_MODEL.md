# INFORMATION_MODEL.md — Finalized Conceptual Model

Status: `DECIDED` — Phase 01, finalized 2026-11-16 after user approval. This is a conceptual model, not a physical schema. Persistence shape is a Phase 03 decision.

## 1. Authority and scope

This document is the single source of truth for shared metadata, status vocabulary, provenance rules, and the definition of a Context View. Type-specific fields live in `RAW_INFORMATION_TAXONOMY.md` and `STRUCTURED_OBJECT_TAXONOMY.md`. Relation semantics live in `RELATIONSHIP_MODEL.md`. Do not duplicate those tables here.

## 2. Hybrid Information Model — `DECIDED`

GSC stores two complementary forms of information.

| Form | Definition | Types |
|---|---|---|
| Raw Information | Original information preserved with its source and provenance | `RAW_INFORMATION_TAXONOMY.md` — Document, Message, Evidence, FileContent |
| Structured Object | Independently addressable semantic object with explicit identity | `STRUCTURED_OBJECT_TAXONOMY.md` — Concept, Hypothesis, Methodology, Decision, EvidenceReference |

Rules:

- A Structured Object may be `derived_from` Raw Information, `references` it, or be created independently.
- Not every raw item becomes an object. Not every object needs a raw source.
- No forced extraction pipeline and no automatic extraction in the MVP.
- Example: paper imported as Raw Information → Hypothesis created as an object → relation `derived_from` links Hypothesis → paper.

Deferred types: Principle, Experience, Taxonomy (`DECISION_LOG.md` D-011). Not rejected; simply not needed by scenarios A–D.

## 3. Three-level model — `DECIDED`

| Level | Name | Examples | Meaning |
|---|---|---|---|
| 1 | Information | text fragments, observations, facts, evidence, messages, source material | Preserve information and its origin |
| 2 | Contextual Objects | Concept, Decision, Hypothesis, Methodology, EvidenceReference | Information with semantic identity and relationships |
| 3 | Context | Knowledge Context (MVP), later User / Workspace / Coworker / Task Context | An organized subset assembled for a subject, scope, or purpose |

These are conceptual distinctions, not three database layers. Do not create infrastructure to represent the levels themselves.

## 4. Domains — `DECIDED`

| Domain | MVP treatment |
|---|---|
| Knowledge Context | primary; all five object types + raw information |
| Work Context | partial: Decision objects only |
| User / Coworker / Artifact Context | out of MVP; reserved as `domain` values |
| Context Access & Retrieval | browse and type/domain filter only; no permission system, no automated assembly |

Concept distinctions (Context Space, Retrieved Context, Working Context, Shared Context) are defined in `PROJECT_CONTEXT.md` §4. Do not redefine them here.

## 5. Shared metadata — authoritative

Every persisted item, raw or structured:

| Field | Required | Type / values | Meaning |
|---|---|---|---|
| `id` | yes | opaque string | Stable, independently addressable identity |
| `type` | yes | enum | Concrete type from a taxonomy doc; e.g. `raw.document`, `object.concept` |
| `title` | yes | string | Short human label |
| `domain` | yes | `knowledge` \| `work` \| `user` \| `coworker` \| `artifact` | Organizational reference; default `knowledge` |
| `origin` | yes | `user` \| `import` \| `agent` | Who created it. Descriptive only — never a trust or verification level |
| `source_label` | no | string | Human-readable origin note, e.g. "Smith 2024, p.3" |
| `created_at` | yes | timestamp | Creation time |
| `updated_at` | yes | timestamp | Last content change |
| `status` | yes | see §6 | Lifecycle state |

Type-specific content fields are defined only in the taxonomy documents. Do not add a generic `payload` JSONB as the system of record; typed fields stay explicit.

## 6. Status vocabulary — `DECIDED`

| Applies to | Values | Meaning |
|---|---|---|
| Raw Information | `active`, `archived` | Whether the source is currently in use. Archiving never deletes content |
| Structured Objects | `draft`, `active`, `superseded` | Lifecycle of the object. `superseded` means a newer object replaced it; the old one stays addressable |

Status is lifecycle, not epistemic verification. A Hypothesis has no "verified" state in the MVP. An object created by an agent starts `draft` unless a user explicitly changes it. No text becomes verified knowledge automatically.

## 7. Provenance and modification history — `DECIDED`

Provenance and history are different things:

- **Provenance** = `origin` + `source_label` + outgoing `derived_from` / `references` relations. Answers "where did this come from?"
- **History** = append-only events attached to an item. Answers "what changed?"

History event shape:

| Field | Meaning |
|---|---|
| `at` | timestamp |
| `actor` | `user` / `agent` / `system`, plus optional actor label |
| `action` | `created` / `updated` / `status_changed` / `relation_added` / `relation_removed` |
| `detail` | short, explicit description of the change |

History is never rewritten. Deleting an item is represented by `archived` or `superseded`, not by erasing events.

## 8. Context View — `DECIDED` (conceptual; implementation in Phase 04)

A Context View is a named, explicitly assembled record:

| Field | Meaning |
|---|---|
| `id`, `title` | identity and label |
| `subject`, `scope`, `purpose` | why the view exists |
| `item_ids` | explicit member list of raw items and objects |

Membership is never inferred from tags, embeddings, or relation traversal. A Context View is a view over the Context Space, not a new storage layer. Phase 04 implements Knowledge Context only, assembled by explicit selection.

## 9. Governance boundary

- Preserve origin and history on every create and update.
- Do not mark agent-generated text as verified.
- No permission system in MVP. `domain` and `origin` exist so permissions can be added later without a concept rewrite.
- "Shared Context" means shared among authorized participants, not everyone.

## 10. Closed and open items

Closed in Phase 01: object set (5 types), status vocabulary, relation kinds including `supports` / `challenges`, file storage location, Context membership rule. See `DECISION_LOG.md`.

Remaining open for Phase 02: exact form layouts, keyword filter behavior, how `supports` / `challenges` are displayed in a detail view.
