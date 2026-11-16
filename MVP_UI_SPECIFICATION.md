# MVP_UI_SPECIFICATION.md — UI Specification

Status: `DECIDED` — Phase 02, 2026-11-16. Implemented visually by `ui-prototype/index.html`; no persistence in the prototype.

## 1. Visual foundation

Standalone app, Overview-style section layout (D-010). Visual rules mirror Thylas "Quiet Computationalism"; code and tokens are not imported.

| Token | Value | Use |
|---|---|---|
| `--bg-app` | `#0A0A0A` | app ground |
| `--bg-surface` | `#161616` | panel / form surface |
| `--bg-rail` | `#101010` | header / toolbar |
| `--ink` | `#EBEBEB` | primary text |
| `--ink-2` | `#A8A8A8` | secondary text |
| `--ink-3` | `#6E6E6E` | meta / disabled |
| `--line` | `#2A2A2A` | 1px hairline |
| `--line-strong` | `#3A3A3A` | focus / active hairline |
| `--accent` | `#FFFFFF` | selection and primary action only |
| `--tint-sel` | `#1F1F1F` | selected row |
| `--tint-hover` | `#181818` | hover row |
| `--error` | `#D98A7A` | validation text (never sole encoding) |

Type: UI 13/20, caption 11/16, read 16/26, section 20/28, display 32/40, mono 12/18. Fonts: Inter Variable fallback system-ui; IBM Plex Mono fallback monospace. Numerals and ids use mono.

Spacing: 4 / 8 / 12 / 16 / 24 / 32. Radius: 4 (small), 8 (panel/form). No shadow. One display per screen. Dividers are hairlines only.

## 2. Layout

```text
┌────────────────────────────────────────────────────────────┐
│ GSC   Library | Contexts                        New        │ 48px header
├────────────────────────────────────┬───────────────────────┤
│ Information            7 items    │ Detail                │
│ [All types ▾] [All domains ▾] [⌕] │ ───────────────────── │
│ ────────────────────────────────  │ Type / title          │
│ ▪ DOC  Paper on ...      active   │ typed fields          │
│ ▪ CON  Context Window ... draft   │ Provenance            │
│ ▪ HYP  Chunking beats ... draft   │ Relations             │
│ ...                               │ History               │
└────────────────────────────────────┴───────────────────────┘
     minmax(0,1fr)                      340px, collapses <900px
```

Main column: `SectionLabel` (caption + 6px tick + hairline + count) → toolbar → rows. Right panel: detail, hidden when nothing is selected. Below 900px the detail panel takes full width under the list.

## 3. Screens

| Id | Screen | Content |
|---|---|---|
| S1 | Library | section header, type/domain filters, keyword input, 44px rows, empty state |
| S2 | Detail | title, type, status, typed fields, Provenance, Outgoing, Incoming, History; Edit / Link actions |
| S3 | New — Raw | inline panel replacing the list: type picker, required typed fields, `source_label` |
| S4 | New — Object | inline panel: type picker, typed fields, optional source picker (required for EvidenceReference) |
| S5 | Link | inline block in S2: relation kind, target picker, optional note |
| S6 | Edit | inline form in S2: typed fields + notes only; Save / Cancel |
| S7 | Knowledge Context | header with subject / scope / purpose; explicit member rows; Add member picker |

## 4. Components

### Row (S1)

Full-width `<button>`: glyph (2-letter mono) → title + meta line → right-aligned status text. 44px height. Hover adds `--tint-hover`; selected adds `--tint-sel` and a 1px left accent line. Status is text (`draft` / `active` / `archived` / `superseded`), not a colored chip.

### Form field

Label above input, 8px gap. Required fields show `required` in caption. Validation message appears under the field in `--error` and is paired with an inline text hint. No placeholder-only labels.

### Relation row

`<kind> → <target title>` with optional `note` on the meta line. `supports` and `challenges` are written as literal text labels, prefixed with `+` / `−` glyphs for scanning. Color never encodes stance. A footnote states "stance only; not verification".

### History row

`<time> · <actor> · <action> — <detail>`. Mono time, 32px row. Append-only order, newest first.

### Empty state

`EmptyState{title, hint, action}`. Must name the missing thing: "No concepts yet. Create a concept." Never "No data".

## 5. Closed UI decisions from Phase 01

| Issue | Decision | Decision id |
|---|---|---|
| Form layout | Inline panels in main column (New) or detail panel (Edit/Link). No modals | D-019 |
| Keyword filter | Case-insensitive substring over `title` + typed text fields; input sits in Library toolbar; count shown; no ranking | D-020 |
| Stance display | Literal text `supports` / `challenges` with `+` / `−` glyph; no color or status change | D-021 |

## 6. Interaction rules

- Enter submits a form; Esc closes an inline panel and restores the previous view.
- Selecting a row never mutates data.
- Saving shows the resulting item in detail, not a toast.
- Every mutation appends exactly one history event.
- Raw item content has no Edit action (D-014). Its title, `source_label`, and `status` do.
- No graph view, no dashboard widgets, no AI input, no auth UI.

## 7. Prototype scope

`ui-prototype/index.html` is a single self-contained file. It uses inline CSS/JS and a fixed in-memory sample set. It renders S1–S7 and lets the user click through the flows. It does not persist, validate against a server, or call any API. A visible `PROTOTYPE · in-memory` marker prevents mistaking it for a working product.

Phase 03 will replace the sample data with the shared API contract and the local PostgreSQL adapter, keeping this screen structure.
