# UI_LAYOUT_PLAN.md — Layout Update (v2)

Status: `DECIDED` — 2026-11-19, user-supplied layout plan ("下面是Layout更新计划"). Execution order follows the user's recommendation: Raw → Objects → Contexts → Overview → Recently → Settings. Design source of truth is the user plan; style refs in text (medium.com / tokie.is / logically.app / behance.net) are illustrative only.

## 0. Rename and page set

- Current "Overview" (logo + 「下一步我们添加什么？」 + Composer) → **Start**.
- New **Overview** = entry to the Context Space (summary + navigation), per user plan §2.
- Sidebar `GENERAL`: Start, Overview, Recently · `INFORMATION`: Raw Information, Structured Objects · `ORGANIZATION`: Contexts, Sync · bottom: Settings, Documentation.

## 1. Two page modes (user plan §9)

| Mode | Used by | Traits |
|---|---|---|
| A — Collection View | Raw Information, Structured Objects, Contexts lists; Recently | compact rows, search + filter, quick create, column headers, no card waterfall |
| B — Object Detail View | raw detail, object detail, context detail | clear object identity, ordered blocks (definition / properties / relationships / sources / contexts), view vs edit states |

Detail pages replace the collection in the main area (full width, back control). Every object answers: what is it / where does it come from / what is it related to / which Contexts use it.

## 2. Task cards

### L1 Delete + helpers (support)

- **Purpose:** Object Detail header needs 删除; Recently needs relative time and visit tracking.
- **Scope:** `DELETE /api/items/:id` (cascade item_content/relations/events), `api.deleteItem`, `src/lib/format.ts` (relative time), `src/lib/visits.ts` (localStorage visit log).
- **Does not own:** trash/undo, context deletion.
- **Test:** router test for delete + cascade; `npm run api:check` untouched.

### L2 Raw Information — List + Detail (P0)

- Collection: title + count, Search, Type Filter (All + 4 raw types), `+ Add`; rows Name / Type · Source / Updated.
- Detail blocks: 原始内容 (immutable) · 来源与来源元数据 · 基本属性 · 被哪些 Structured Objects 引用 (incoming relations) · 属于哪些 Contexts.
- Principle: raw content and derived content stay strictly separated — never render a generated summary in place of the raw text.

### L3 Structured Objects — List + Detail (P0, detail is the centerpiece)

- Collection: Search, `+ Create`, type tabs All/Concepts/Decisions/Methodologies/Hypotheses; rows Name / Type · N sources.
- Detail blocks: Header (name, type, edit, delete) · Definition (core field per type) · Properties · Relationships (other objects, list only — no graph) · Sources (linked raw information) · Contexts.

### L4 Contexts — List + Detail (P0)

- Collection: `Find a context...`, `+ New Context`; rows Title / Subject · Scope / Members / Updated.
- Detail: upper Context Definition (Subject, Scope, Purpose — editable), lower Members (explicit list, `+ Add Items`, Remove). Future (Notes/History/Sharing/Composition) stays out.

### L5 Overview (P1) + Start rename

- Welcome Header: title, one-line description, create entry.
- Space Summary: Information / Objects / Contexts counts (numbers only — no charts).
- Recently Updated: recent items (title + type).
- Your Contexts: recent contexts (title + member count).
- It is a navigable entry, not a monitoring dashboard.

### L6 Recently (P2) + Settings (P2)

- Recently: time groups Today / Yesterday / Previous 7 Days / Earlier; filter All / Information / Objects / Contexts; rows distinguish 访问 (visited) vs 修改 (updated) via `src/lib/visits.ts`; click opens the object's detail page.
- Settings: left secondary nav (General / Account / Data Management / Connections / Privacy) + right content. Only basic account, data management and connections now; existing theme/animation/model controls live under General.

## 3. Milestones

| Milestone | Tasks | Done when |
|---|---|---|
| M1 | L1 | delete endpoint works; helpers unit-usable |
| M2 | L2, L3, L4 | three P0 pages render as Collection + Object Detail |
| M3 | L5, L6 | Start/Overview/Recently/Settings per plan |
| M4 | verification | check/test/build/api:check pass; light + dark screenshots recorded |

## 4. Verification matrix

| Check | Method | Expected |
|---|---|---|
| Types / tests / build | `npm run check` / `npm test` / `npm run build` | pass |
| Delete | `npm test` route test + UI delete button | item and its relations/events gone; back to list |
| Detail content | screenshot each detail page | blocks per §2 present; raw text not summarized |
| Recently | screenshot | time groups + visited/updated tags |
| Settings | screenshot | secondary nav + General content |
| Themes | dark spot-check screenshots | new pages theme-aware |

## 5. Out of scope (user plan agrees)

Card dashboards, statistics charts, graph visualization, activity timelines, AI summaries of raw content, permission/API key settings, Context Notes/History/Sharing/Composition.
