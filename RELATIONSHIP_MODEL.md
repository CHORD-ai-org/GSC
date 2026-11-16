# RELATIONSHIP_MODEL.md — Relationships and Provenance Links

Status: `DECIDED` — Phase 01, 2026-11-16. Relation kinds and semantics are final for the MVP; physical representation is a Phase 03 decision.

## 1. Principle

Relationships are explicit records with an id, kind, endpoints, and metadata. They are not embedded arrays inside object rows, and no graph engine is used. No transitive traversal, inference, or weight is computed in the MVP.

## 2. Edge fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable edge identity |
| `kind` | yes | One of the five kinds below |
| `from_id` | yes | Source item id |
| `to_id` | yes | Target item id |
| `note` | no | Short human explanation of the link |
| `created_at` | yes | Creation time |
| `created_by` | yes | `user` / `agent` / `system` |

Uniqueness: `(kind, from_id, to_id)`. Adding the same edge twice is rejected, not deduplicated silently. Relation add/remove emits history events on both endpoints.

## 3. Kinds

| Kind | From | To | Meaning | Scenario |
|---|---|---|---|---|
| `derived_from` | Structured Object | Raw Information or Structured Object | The object originated from this source. Carries provenance weight | A, C |
| `references` | Structured Object | Raw Information or Structured Object | Pointer only. Does not claim derivation | A, B |
| `related_to` | any item | any item | Generic association; `note` explains it | B, D |
| `supports` | Structured Object | Structured Object | The source object offers supporting stance for the target | A |
| `challenges` | Structured Object | Structured Object | The source object contests the target | A |

`supports` / `challenges` are retained: Scenario A needs a Critic-style challenge to be representable, and they add no engine complexity — they are just labeled edges. They do not change status or verify any claim.

## 4. Constraints

- At most one `derived_from` edge per object. Provenance has a single primary origin; `references` can be many.
- Self-links are rejected.
- `derived_from` and `references` always point outward from a Structured Object. Raw Information never asserts derivation from an object.
- `related_to` is symmetric in display but stored once; it appears in both endpoints' detail views.
- No required acyclic graph. Cycles via `related_to` are allowed and harmless because no traversal exists.

## 5. Display rule — `PROPOSED` for Phase 02 UI

- Detail view shows two sections: **Outgoing** and **Incoming**.
- Each row: relation kind → other item's title → optional `note`.
- No graph canvas, no force layout, no transitive expansion.
- Exactly how `supports` / `challenges` are visually marked is a Phase 02 UI decision.

## 6. Provenance reconstruction

To answer "where did this claim come from", read in order:

1. object `origin` and `source_label` (`INFORMATION_MODEL.md` §5)
2. its single outgoing `derived_from` edge
3. any outgoing `references` edges
4. the target raw item's `locator` and immutable content

If none exists, the answer is "independently created" — never "unknown source implied by agent generation".

## 7. Out of scope

No relevance scoring, embedding-based linking, automatic relation discovery, graph queries, conflict resolution between edges, or permission checks on edges. Shared Context is not unrestricted access; the model keeps `origin` and `domain` so authorization can be added later.
