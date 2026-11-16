# RAW_INFORMATION_TAXONOMY.md — Raw Information Types

Status: `DECIDED` — Phase 01, 2026-11-16. Shared metadata and status vocabulary: `INFORMATION_MODEL.md` §5–6.

## 1. Principle

Raw Information is original material preserved as-is with its source. It is not required to produce a Structured Object. No automatic extraction, summarization, or classification happens in the MVP.

## 2. Types

| Type | Use | Required type-specific fields | Optional fields |
|---|---|---|---|
| `raw.document` | pasted or imported text: paper, note, spec | `content_text` | `author`, `source_url` |
| `raw.message` | conversation excerpt, observation, recorded statement | `content_text`, `author` | `captured_at` |
| `raw.evidence` | quote, data point, measurement | `content_text`, `locator` | `measured_at` |
| `raw.filecontent` | imported file content | `filename`, `storage_ref` | `content_text`, `mime_type` |

`locator` is a human-readable pointer such as `p.3` or `line 42-48`. It is text, not a parsed range.

## 3. Scenario coverage

| Scenario | Required raw types |
|---|---|
| A — Research | `raw.document` (paper) + `raw.evidence` (passage) |
| B — Knowledge Organization | none strictly required; objects created independently |
| C — Decision Continuity | `raw.evidence` or `raw.document` as decision source; `raw.message` as recorded discussion |
| D — Context Organization | any existing raw item may be a context member; `raw.filecontent` covers imported files |

Every raw type is used by at least one scenario: Document A/C, Message C, Evidence A/C, FileContent D. No extra type is retained.

## 4. Import and creation behavior

| User action | Result |
|---|---|
| Paste text | creates `raw.document` with `content_text` |
| Record an observation | creates `raw.message` with `author` |
| Save a quote with a locator | creates `raw.evidence` |
| Import a text file | creates `raw.filecontent`; text copied to `content_text`, original written to local storage |
| Import a non-text file | creates `raw.filecontent` with `storage_ref`; no parsing |

Validation: `title` non-empty; at least one of `content_text` or `storage_ref` present. No import pipeline runs automatically.

## 5. Storage location — `DECIDED`

- Database holds metadata and `content_text` for text-based items.
- Original uploaded files live on local disk under `data/files/<id>`; the DB stores a relative `storage_ref`.
- No binary blobs and no large JSONB in the database.
- Rationale: keeps provenance and identity explicit in the DB while avoiding a blob store for the MVP. Local disk is sufficient for an independently runnable prototype.
- Revisit at Phase 03 only if container/production deployment requires a different adapter.

## 6. Immutability — `DECIDED`

Raw item content is immutable after creation. `title`, `source_label`, and `status` may be edited. A correction creates a new item linked with `related_to`.

Rationale: an edited "original" destroys provenance. Corrections are new information, not silent rewrites.

## 7. Lifecycle

`active` → `archived`. Archived items remain addressable and visible in detail views. Deletion is not a feature of the MVP. All changes emit a history event per `INFORMATION_MODEL.md` §7.
