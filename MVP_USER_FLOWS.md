# MVP_USER_FLOWS.md — User Workflows

Status: `DECIDED` — Phase 02, 2026-11-16. Describes the MVP interaction contract. The Phase 02 HTML prototype simulates these flows in memory; persistence arrives in Phase 03.

## 1. Navigation hierarchy

```text
GSC standalone app
├── Library                primary view: browse all raw items and objects
│   ├── filter: type / domain / keyword
│   ├── New                 inline panel: Raw item | Structured object
│   └── item row → Detail   right panel, read-only by default
│       ├── Edit            inline form in the same panel
│       ├── Link            inline form in the same panel
│       ├── Provenance      read-only section
│       ├── Relations       Outgoing / Incoming
│       └── History         append-only event list
└── Contexts
    └── Knowledge Context   explicitly assembled member list
```

Two views only. No tabs beyond these, no dashboard, no graph canvas. Every Phase 01 action is reachable in ≤3 steps from Library.

## 2. Screen inventory

| Id | Screen | Role |
|---|---|---|
| S1 | Library | primary list, filters, New entry point |
| S2 | Detail panel | typed content, provenance, relations, history |
| S3 | New — Raw item | type-specific form + source label |
| S4 | New — Structured object | type-specific form + optional source picker |
| S5 | Link | relation kind + target + note, inside S2 |
| S6 | Edit | inline edit of typed fields and notes, inside S2 |
| S7 | Knowledge Context | explicit member list + add/remove |

## 3. Required workflows

### F1 — Create Raw Information

| Step | User action | System response | State |
|---|---|---|---|
| 1 | Library → New → "Raw item" | S3 opens inline; type selector lists 4 raw types | form |
| 2 | choose type; fill required fields; add `source_label` | required-field check on submit | form |
| 3 | Save | new row appears in Library; detail opens | item `active`, history event `created` |

No automatic object is created. No text is parsed or summarized.

### F2 — Import / record source material

| Step | User action | System response | State |
|---|---|---|---|
| 1 | S3 → choose `raw.filecontent` | file input + title appear | form |
| 2 | select file | filename captured; text copied if text-based; `storage_ref` assigned | form |
| 3 | Save | item created with immutable content | `raw.filecontent`, `active` |

Paste text uses `raw.document`; a recorded observation uses `raw.message`; a quote with a pointer uses `raw.evidence`. Same create path.

### F3 — Create Structured Object

| Step | User action | System response | State |
|---|---|---|---|
| 1 | Library → New → "Structured object" | S4 opens; type selector lists 5 object types | form |
| 2 | choose type; fill required typed fields | fields change with type; no inference | form |
| 3 | optionally pick a raw item as source | `derived_from` edge queued | form |
| 4 | Save | object created; detail shows source link | object `draft`, history `created`, optional edge |

For `object.evidencereference`, `source_item_id` is required, not optional.

### F4 — Connect object to its source

| Step | User action | System response | State |
|---|---|---|---|
| 1 | S2 of an object → Link | S5 opens | form |
| 2 | choose `derived_from` or `references`; pick target raw item | target list shows raw items only; one `derived_from` max | form |
| 3 | Save | Outgoing section shows the edge | edge created; history event on object |

Same flow with `references` allows object targets. Raw items cannot start an outgoing `derived_from`.

### F5 — Connect objects to each other

| Step | User action | System response | State |
|---|---|---|---|
| 1 | S2 → Link | S5 opens | form |
| 2 | choose `related_to`, `supports`, or `challenges`; pick target object; optional `note` | stance kinds show text labels only | form |
| 3 | Save | both endpoints show the edge in Outgoing/Incoming | edge created; history on both |

No graph view. No status change from `supports` / `challenges`.

### F6 — Browse information

| Step | User action | System response | State |
|---|---|---|---|
| 1 | open Library | compact rows: glyph, type, title, domain, status, updated at | list |
| 2 | choose type or domain filter | rows narrow; count updates | filtered list |
| 3 | type keyword | case-insensitive substring over title + typed text fields | filtered list |
| 4 | click a row | S2 opens with that item | selection |

Empty state names the action: "No concepts yet. Create a concept." Not "no data".

### F7 — Inspect provenance

| Step | User action | System response | State |
|---|---|---|---|
| 1 | S2 → Provenance | shows `origin`, `source_label`, `created_at`, `updated_at` | read-only |
| 2 | follow `derived_from` link | target raw item opens in S2 | selection changes |
| 3 | read raw item content | original text unchanged; `locator` shown if present | read-only |

If no source edge exists, the panel says "Independently created". It never implies agent generation equals source.

### F8 — Edit and update

| Step | User action | System response | State |
|---|---|---|---|
| 1 | S2 → Edit | S6 opens with typed fields and notes only | edit mode |
| 2 | change fields; Save | validation; `updated_at` changes; one history event appended | item updated |
| 3 | verify | History shows `updated` with actor and time | read-only |

Source, origin, and relations are not editable in S6. Raw item content is not editable (D-014); a correction creates a new item with `related_to`.

## 4. Scenario walks

| Scenario | Flow sequence |
|---|---|
| A — Research | F2 import paper → F3 create Hypothesis + Concept, attach source → F5 `supports` / `challenges` → F7 inspect |
| B — Knowledge Organization | F3 create Concepts + Methodologies → F5 `related_to` → F6 browse → F7 inspect both ends |
| C — Decision Continuity | F2 record evidence → F3 create Decision with reasoning/alternatives/consequences → F4 attach source → F8 edit → F7 inspect |
| D — Context Organization | S7 → add existing objects by explicit selection → open Knowledge Context → inspect member list |

## 5. Interaction rules

- No modal dialogs. New/Edit/Link are inline panels.
- No destructive action. Archive/replace changes `status` only.
- No automated extraction, classification, or validation of claims.
- No keyboard-only power features beyond Enter to submit and Esc to close an inline panel.
- Every mutation emits one history event and updates `updated_at`.
- Prototype uses in-memory sample data; no writes survive reload until Phase 03.
