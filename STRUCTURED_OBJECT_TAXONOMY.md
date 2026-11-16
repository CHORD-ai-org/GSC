# STRUCTURED_OBJECT_TAXONOMY.md — Structured Object Types

Status: `DECIDED` — Phase 01, 2026-11-16. Shared metadata and status vocabulary: `INFORMATION_MODEL.md` §5–6.

## 1. Principle

A Structured Object is explicitly created, independently addressable, and has typed content fields. It may be created from a source, from scratch, or by a user acting on an agent suggestion — but never by silent automatic extraction. An agent-created object starts as `draft`.

## 2. Types and fields

All objects use every shared metadata field from `INFORMATION_MODEL.md` §5. The fields below are the type-specific content.

### `object.concept`

| Field | Required | Meaning |
|---|---|---|
| `definition` | yes | Short statement of what the concept means |
| `notes` | no | Additional context, examples, caveats |

### `object.hypothesis`

| Field | Required | Meaning |
|---|---|---|
| `claim` | yes | The testable statement |
| `reasoning` | no | Why this claim was proposed |
| `notes` | no | Additional context |

No `verified` field. `supports` / `challenges` relations express stance without promoting the claim to fact.

### `object.methodology`

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Method name (may duplicate `title`; kept for clarity in lists) |
| `steps` | yes | Ordered steps as plain text |
| `intended_use` | no | When to apply it |
| `notes` | no | Additional context |

This is a definition only. Methodology execution is not part of GSC.

### `object.decision`

| Field | Required | Meaning |
|---|---|---|
| `statement` | yes | What was decided |
| `reasoning` | yes | Why |
| `alternatives` | no | Options considered |
| `consequences` | no | Expected or observed consequences |
| `notes` | no | Additional context |

### `object.evidencereference`

| Field | Required | Meaning |
|---|---|---|
| `claim` | yes | What this evidence is taken to show |
| `source_item_id` | yes | id of a Raw Information item |
| `locator` | no | Precise pointer inside the source |
| `notes` | no | Interpretation caveats |

This object is an interpretation of a source, not the source itself. The source keeps its own immutable content.

## 3. Scenario coverage

| Scenario | Objects required |
|---|---|
| A — Research | Hypothesis, Concept, EvidenceReference |
| B — Knowledge Organization | Concept, Methodology |
| C — Decision Continuity | Decision, EvidenceReference |
| D — Context Organization | any existing objects |

All five types are used. No extra type is retained. Principle, Experience, Taxonomy remain `DEFERRED` (D-011).

## 4. Creation and validation

- User chooses a type explicitly; no inference from text.
- Required fields must be non-empty.
- `source_item_id` on EvidenceReference must resolve to an existing raw item.
- Relations are added after creation via the relationship form (`RELATIONSHIP_MODEL.md`).
- Every create/update emits a history event.

## 5. Lifecycle

`draft` → `active` → `superseded`. Superseded objects stay addressable and visible. A `superseded` object must state its replacement in `notes` or via a `related_to` relation. No hard delete in the MVP.
