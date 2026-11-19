# PHASE_05_UI_PLAN.md — UI Shell & Interaction Layer

Status: `DECIDED` — 2026-11-19, user instruction "制定计划，实现这个UI（记得把截图保存下来）".
Design input: four screenshots saved under `ui-prototype/refs/` (see that folder's README for the mapping to the original clipboard names).

## 1. What the screenshots say (design input, literal)

Source: `ui-prototype/refs/01-spec-board-sidebar-animations.jpg` (spec board), `02-shell-overview-composer.png` (style prototype), `03-composer-detail-models.png`, `04-canvas-window.png`.

| # | Literal requirement (from the annotations and mockups) |
|---|---|
| 1 | Sidebar real option list (01 is authoritative on content): **GENERAL** → Overview, Recently · **INFORMATION** → Raw Information, Structured Objects · **ORGANIZATION** → Contexts · bottom cluster → Settings, Documentation. |
| 2 | "还要添加这一项：**Sync**：用于数据的同步，导出....（比如导出给 Claude Code 或者是 Codex）" — a Sync entry for data sync/export. |
| 3 | "这里的模型默认 **Deepseek**和**Rym**" — the composer model selector defaults to Deepseek and Rym (mock shows an "Atlas" placeholder). |
| 4 | "页面切换时可以使用的动画" — mosaic tile-grid animation on page switch (blurred grayscale tiles, reference image on the board). |
| 5 | "拖动鼠标时要有这样的背景动画" — mouse-following dot-grid background animation, with quality selector **Off / Low / Medium / High / Max** (reference shows Medium selected). |
| 6 | Overview home (02): GSC blocky logo, line 「下一步我们添加什么？」, bottom **Ask anything** composer with Ask / Agent / Edit pills, provider chip `Local ▾`, model chip `Atlas ▾` (→ Deepseek / Rym per #3), mic button, black circular submit (↑). |
| 7 | Canvas window (04): top command bar 「搜索或输入操作」 + `[+]` + panel-toggle buttons; empty state rows 「画布预览」 and 「打开文件...」 with `Ctrl O` hint. |

Rule where sources conflict: 01 wins on content (sidebar items, model names), 02/04 win on visual style (light theme, rounded surfaces, grouped sidebar, pill controls).

## 2. Goal and non-goals

**Goal:** replace the Phase 03 dark shell with the light shell above, keep every existing capability (items CRUD, relations, provenance/history, contexts) working, and add the four new surfaces: Overview+Composer, Canvas, Sync, Settings/Documentation — plus the two animations with a quality control.

**Non-goals (explicit):**
- LLM inference / real model calls (Deepseek, Rym) — `DESIGN_BOUNDARIES.md` §1 puts inference outside GSC. The composer is UI-complete and its submit captures the text as a `raw.document` item. Model wiring stays `DEFERRED`.
- Voice input from the mic button (visual only).
- Real multi-device sync protocol. Sync = export/import bundle for now.
- Graph canvas, drag-arrange object layout (Canvas preview is a read-only card grid).
- Thylas integration (unchanged boundary).

## 3. View map

```text
┌─────────────┬──────────────────────────────────────────────┐
│ Sidebar     │ Main area (per-view)                         │
│             │                                              │
│ GENERAL     │ Overview   logo + 下一步我们添加什么？        │
│  Overview   │            + Composer (Ask/Agent/Edit,       │
│  Recently   │              Local ▾, Deepseek/Rym ▾,        │
│ INFORMATION │              mic, submit)                    │
│  Raw Info   │ Recently   items by updated_at desc          │
│  Struct Obj │ Raw Info   existing list+detail, raw.* only  │
│ ORGANIZATION│ Struct Obj existing list+detail, obj.* only  │
│  Contexts   │ Contexts   existing Phase 04 view            │
│  Sync       │ Sync       export JSON / Markdown bundle /   │
│             │            Claude Code·Codex context file    │
│ ─────────── │ Settings   animation quality Off..Max,       │
│  Settings   │            page-transition toggle            │
│  Docs       │ Docs       shortcuts and help                │
│             │ Canvas     command bar 搜索或输入操作 + [+]   │
│             │            + panel toggle; empty state       │
│             │            画布预览 / 打开文件... Ctrl O      │
└─────────────┴──────────────────────────────────────────────┘
```

Navigation rules: sidebar list is exactly the 01 list plus Sync (D-032). Canvas is not a sidebar row (the 01 list is authoritative); it opens via `Ctrl+O` (open file) and an 「画布预览」 entry in the Overview area — see open question Q1.

## 4. Task cards

### P5-0 Save design references and plan

- **Purpose:** keep the four screenshots and the reading of them in the repo so the work is reproducible.
- **Scope:** `ui-prototype/refs/` (4 images + README), this plan, `DECISION_LOG.md`, `DEVELOPMENT_ROADMAP.md`, `THINKING.md`.
- **Interacts with:** AGENTS.md change-control rules.
- **Does not own:** any code.
- **User flow:** open refs README → see which screenshot means what.
- **Minimum:** files listed above, consistent with each other.
- **Test:** mapping table in `ui-prototype/refs/README.md` covers all four original names.

### P5-1 Light tokens and app shell (Sidebar + main area)

- **Purpose:** give every screen the new structure and the light visual style.
- **Scope:** `src/styles/tokens.css`, `src/styles/base.css`, `src/app/app.module.css`, `src/app/Sidebar.tsx` (new), `App.tsx` layout split. Sidebar groups and icons per §3; selected state per 02 (rounded light-gray row).
- **Interacts with:** all views (they render inside the shell).
- **Does not own:** view content, animations, data logic.
- **User flow:** open app → sidebar shows GENERAL/INFORMATION/ORGANIZATION + bottom cluster → clicking any row switches the main area.
- **Minimum:** shell renders with placeholder view bodies; all 8 nav rows route.
- **Test:** `npm run check`; headless Chrome screenshot shows sidebar groups and one active view.

### P5-2 Overview and Composer

- **Purpose:** the new home surface and the "ask anything" input (02/03).
- **Scope:** `src/views/Overview.tsx`, `src/app/Composer.tsx` (new). GSC logo, 「下一步我们添加什么？」, composer card: textarea "Ask anything", pills Ask/Agent/Edit (default Agent), `Local ▾` provider chip, model chip with default options **Deepseek** (selected) and **Rym**, mic button (visual), black circular submit.
- **Interacts with:** `src/services/api.ts` (createItem), `src/lib/items.ts`.
- **Does not own:** LLM calls, voice capture.
- **User flow:** Overview → type text → choose mode/model → submit → item created as `raw.document` → appears in Recently and Raw Information.
- **Minimum:** composer UI complete; submit creates one item with `source_label` `composer:<mode>`.
- **Test:** `npm test` contract for the created payload; manual submit → item visible in Raw Information.

### P5-3 Data views migration (Recently / Raw Information / Structured Objects / Contexts)

- **Purpose:** keep every existing capability reachable from the new sidebar.
- **Scope:** `App.tsx` view routing + filters: Raw Information = `raw.*`, Structured Objects = `object.*`, Recently = all sorted by `updated_at` desc (cap 20), Contexts = Phase 04 view unchanged in behavior. Detail panel, New/Edit/Link panels, history unchanged.
- **Interacts with:** `src/lib/items.ts`, `src/services/api.ts`, existing panels.
- **Does not own:** new data model, new endpoints.
- **User flow:** Raw Information → filter/keyword → open detail → edit/link as before; Contexts → add/remove member as before.
- **Minimum:** four views working against the live API with the existing panels.
- **Test:** `npm test` (existing 20) pass; `npm run api:check` (10) pass; manual create → detail → edit → history.

### P5-4 Sync, Settings, Documentation

- **Purpose:** deliver the new Sync item ("数据的同步，导出....比如导出给 Claude Code 或者是 Codex") and the animation controls.
- **Scope:** `src/lib/sync.ts` (bundle builders), `src/views/SyncView.tsx`, `src/views/SettingsView.tsx`, `src/views/DocsView.tsx`, `src/lib/prefs.ts` (localStorage prefs).
  - Sync: three export actions — full JSON (`gsc-export.json`), Markdown bundle (`gsc-bundle.md`), and **Claude Code / Codex** context file (`GSC-CONTEXT.md`, drop-in context doc for agent CLIs).
  - Settings: background animation quality `Off/Low/Medium/High/Max` (the 01 pill selector), page-transition animation toggle, default model display.
  - Documentation: shortcut list (`Ctrl+O` open file), view guide, sync guide.
- **Interacts with:** `src/services/api.ts` (read items/contexts/relations), `src/lib/prefs.ts`, animation layer (P5-6).
- **Does not own:** sync protocol, cloud endpoints, file watchers.
- **User flow:** Sync → click export → browser downloads the file; Settings → pick quality → background animation reacts immediately; preference survives reload.
- **Minimum:** three downloads work offline against live data; prefs persist in `localStorage`.
- **Test:** `src/lib/sync.test.ts` for bundle shape; manual download + reload persistence check.

### P5-5 Canvas view

- **Purpose:** implement the 04 window surface.
- **Scope:** `src/views/CanvasView.tsx`, `src/app/CommandBar.tsx` (new). Command bar 「搜索或输入操作」 (filters commands/items), `[+]` (new item), panel toggle. Empty state rows 「画布预览」 and 「打开文件...」 with `Ctrl O`. Open file → existing `POST raw.filecontent` import path. After preview/import: read-only card grid on the canvas surface; card click opens detail.
- **Interacts with:** `src/services/api.ts`, file import flow from Phase 03.
- **Does not own:** free-drag layout, drawing tools, real canvas document format.
- **User flow:** `Ctrl+O` → pick file → imported as `raw.filecontent` → card appears; 「画布预览」 → card grid of current items.
- **Minimum:** import works and is listed; preview grid renders items.
- **Test:** manual import → item present in Raw Information; `npm test` unaffected.

### P5-6 Animation layer

- **Purpose:** the two animations explicitly requested on the board (01).
- **Scope:** `src/components/animations.tsx` (new):
  - **Page switch:** mosaic tile overlay (grid of blurred grayscale tiles, staggered in/out, ≈350 ms) triggered on sidebar view change; skipped when the Settings toggle is off.
  - **Mouse background:** fixed canvas dot-grid behind the UI; dots tint pink/purple and scale near the pointer (distance falloff). Quality levels map to grid density and effect budget: `Off` (none), `Low` (coarse grid, no tint), `Medium` (default, tint near pointer), `High` (finer grid + drift), `Max` (finest grid + drift + trail).
- **Interacts with:** `src/lib/prefs.ts` (quality, toggle), every view (shared background).
- **Does not own:** per-view motion design, layout transitions beyond the mosaic.
- **User flow:** switch pages → mosaic plays; move mouse → dots react; Settings → change quality → effect changes instantly.
- **Minimum:** both effects run at Medium by default without blocking input (pointer-events: none).
- **Test:** `npm run build` passes; screenshot with quality Off vs Max shows different density; switching views triggers the overlay.

## 5. Milestones

| Milestone | Tasks | Done when |
|---|---|---|
| M1 | P5-0, P5-1 | refs + plan + decisions committed to docs; light shell with 8 nav rows renders |
| M2 | P5-2 | composer submits and creates an item |
| M3 | P5-3 | all previous capabilities reachable and working |
| M4 | P5-4, P5-5 | three Sync downloads work; Settings persists; Canvas import works |
| M5 | P5-6 | both animations respond to their controls |
| M6 | verification | `check`/`test`/`build`/`api:check` pass; screenshots recorded in `IMPLEMENTATION_STATUS.md` |

## 6. Verification matrix

| Check | Command / method | Expected |
|---|---|---|
| Types | `npm run check` | pass |
| Tests | `npm test` | previous 20 + new sync/prefs tests pass |
| Build | `npm run build` | pass |
| API | `npm run api:check` | 10 checks pass |
| Shell render | headless Chrome, 1440×900 | sidebar groups + Overview composer render |
| Canvas | `Ctrl+O` flow / import | imported file listed as card |
| Animation | Settings quality Off→Max, view switch | density changes; mosaic plays once |
| Prefs | reload page | quality setting kept |

## 7. Open questions (non-blocking; defaults chosen)

| # | Question | Default taken | Alternative |
|---|---|---|---|
| Q1 | Where does Canvas live? | Not in the sidebar (01 list is authoritative); opened via `Ctrl+O` and an 「画布预览」 entry in Overview | make it a sidebar row, or a separate window |
| Q2 | Where does Sync sit? | `ORGANIZATION` group (Contexts, Sync) | bottom cluster with Settings/Documentation |
| Q3 | Composer submit behavior without an LLM | capture text as `raw.document` | disabled button until a model is connected |
| Q4 | "Rym" spelling | copied literally from the screenshot | rename when a real model list exists |

## 8. Risks

| Risk | Mitigation |
|---|---|
| Restyle breaks existing list/detail/forms | keep Phase 03 markup and logic; change tokens and layout CSS first, re-screenshot each view |
| Animation cost on weak machines | quality control with Off; all effects behind `pointer-events: none`; rAF throttling |
| Scope creep into LLM/agent features | non-goals §2; composer capture-only recorded in D-033 |
