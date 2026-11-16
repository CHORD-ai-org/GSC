# THYLAS_REFERENCE.md — Reference Project Audit

Audited: 2026-11-16. Target: `D:\github projects\Thylas`. No files were modified.

Labels: **[V]** verified in code or file; **[D]** documented only; **[N]** not found; **[A]** assumption, not verified.

## 1. Stack and structure

- **[V]** Vite 6 + React 19.1 + react-router-dom 7.1.1 + TypeScript 5.7 + Vitest 5.1 + CodeMirror 6. `package.json:2-48`.
- **[V]** No Tailwind, no UI library, no state-management library, no animation library. `package.json:22-34`.
- **[V]** Source layout: `src/app`, `src/components`, `src/data`, `src/lib`, `src/pages`, `src/services`, `src/shell`, `src/state`, `src/styles`. `src/`.
- **[V]** `src/components/` has only 5 files: `ui.tsx`, `ui.module.css`, `icons.tsx`, `CoworkerAvatar.tsx`, `coworker-avatar.module.css`.
- **[V]** No `hooks/`, no design-system package, no barrel files, no per-feature `types.ts`. `docs/architecture/tech-stack.md:273`.
- **[V]** React Router `createBrowserRouter`; top-level routes `/login`, `/onboarding`, `/`; children registered in `src/app/routerChildren.tsx:51-97`.
- **[V]** URL construction centralized in `src/lib/routes.ts:3-70`.
- **[D]** Migration to react-router 8 is a proposal, not implemented. `docs/architecture/tech-stack.md:130-139`.

## 2. State and styling

- **[V]** Three state classes: URL, persisted view state, transient component state. Shell uses `createContext` (`src/state/app.tsx:68`); domain stores use `useSyncExternalStore` + module snapshot + localStorage envelope (`src/state/workspaces.ts:214-217`, `src/state/coworkers.ts:138-140`).
- **[V]** CSS Modules + token files. No CSS-in-JS. `README.md:27`, `docs/architecture/tech-stack.md:107-126`.
- **[V]** Token import chain: `src/styles/base.css:1-2` → `src/styles/tokens.css:8-10` → `design/tokens.css`, `fonts.css`, `typography.css`, then `themes.css`.
- **[D]** Tailwind explicitly rejected: "installs a second scale beside the tokens". `docs/architecture/tech-stack.md:112`.

## 3. Design system — verified values

- **[V]** Default "warm paper" palette: `--bg-app:#F1EBDD`, `--bg-paper:#F7F2E9`, `--bg-surface:#FBF9F4`, `--bg-rail:#EBE4D4`; `--ink:#493626`, `--ink-2:#927B65`, `--ink-3:#B3A08C`; `--line:#E6DED1`, `--line-strong:#D8CCB9`; `--accent:#B56F50` (terracotta). `design/tokens.css:7-23`.
- **[V]** Status colors: `--ok:#5E6B50`, `--warn:#A8792C`, `--error:#8C3A2B`, `--idle:#927B65`. `design/tokens.css:26-29`.
- **[V]** Three themes via `html[data-theme]`: `warm` (default), `dark`, `light`. Dark: `--bg-app:#0A0A0A`, `--bg-surface:#161616`, `--ink:#EBEBEB`, `--accent:#FFFFFF`. `src/styles/themes.css:9-153`.
- **[V]** Single write point `applyTheme()` in `src/lib/theme.ts:18-25`; pre-paint script in `index.html:15-32`.
- **[V]** Fonts: Inter Variable UI, IBM Plex Mono, Noto Sans SC; self-hosted woff2. `src/styles/typography.css:12-14`, `src/styles/fonts.css:7-58`.
- **[V]** Type ramp: caption 11/16, ui 13/20, read 16/26, section/page 20/28, display 32/40, mono 12/18. `src/styles/typography.css:16-24`.
- **[V]** Spacing: `--s1:4 --s2:8 --s3:12 --s4:16 --s6:24 --s8:32 --s12:48`. `design/tokens.css:48`.
- **[V]** App radii (overriding archive): `--r-xs:4 --r-sm:8 --r-md:12 --r-lg:16 --r-pill:999`. `src/styles/tokens.css:13-26`.
- **[V]** Three z-layers only: sticky 10, overlay 40, palette 50. `src/styles/tokens.css:49-52`.
- **[D]** Visual language name: "Quiet Computationalism". `docs/design/visual-system.md:7`. Five tests: one accent per area, hairline/color-step separation, one display per screen, radius only for clickable things, no motion without state change. `docs/design/visual-system.md:11-21`.
- **[V]** High density: file rows 32px, Overview rows 44px, event rows 32px. `docs/design/visual-system.md:95-106`.

**Interpretation [A]:** GSC's own prototype should reuse the *rules* (tokens, hairlines, one display, dense rows, no card grid), not import Thylas CSS. Independent runtime is a hard boundary.

## 4. Overview page — actual implementation

- **[V]** `src/pages/Overview.tsx:241-395`, styles `src/pages/overview.module.css`, route `/overview` (`src/app/routerChildren.tsx:53`), uses `PlainLayout` (`src/shell/layouts.tsx:7-46`).
- **[V]** Sections in code, top to bottom:
  1. Header `Welcome back, {name}.` — only `--t-display` usage (`:251-254`)
  2. Intent input "Ask one question…" with model status and ⌘↵/esc (`:256-290`)
  3. Two-column `.split`: `minmax(0,1fr) var(--w-panel)`, collapses below 1160px (`overview.module.css:137-144,281-286`)
  4. Continue — 3 recent items (`Overview.tsx:292-323`)
  5. Needs you — pending runs, `EmptyState` when empty (`:325-362`)
  6. Workspaces — `WorkspaceGrid` (`:365-368`)
  7. Recently — 4 compact rows (`:370-392`)
  8. Optional right Ask panel — idle/sending/error/answer (`:98-162`)
- **[V]** Row pattern: full-width `<button>`, glyph → title+meta → right-aligned state, 44px, hover adds tint only. `overview.module.css:163-205`.
- **[V]** `SectionLabel` = caption + 6px index tick + hairline + optional count. `src/components/ui.tsx:75-82`, `src/styles/grammar.module.css:10-29`.
- **[N]** No GSC section, route, component, store, type, or data file in `src/` (grep for `gsc|GSC` = 0 hits).
- **[N]** No GSC UI design, wireframe, or section spec in `docs/`.

## 5. Coworker and Workspace concepts

- **[V]** `Coworker`: `id, name, description, status, createdAt, responsibilities, memberships, pinnedArtifactIds, mindFramework?`. `src/data/coworkers.ts:21-34`.
- **[V]** `Responsibilities {forWork, notFor, output}`; `Membership {wsId, role}`; status `active|paused|archived`. `src/data/coworkers.ts:8-19`.
- **[V]** `MindFramework` is declarative config: `principles, contextPolicy, uncertaintyPolicy, decisionRules, reflection, methodSelection`. `src/lib/coworkers.ts:12-94`.
- **[V]** Coworker pages: `Directory`, `New`, `Detail`, `Config`, `TeamGallery` in `src/pages/coworkers/`. Detail = ChatCore + side sections Current Work / Artifacts / Workspaces / Activity.
- **[V]** `Workspace`: `id, name, scope('personal'|'org'), role?, members?, counts{files,boards,processes,notes}`. `src/data/types.ts:10-19`.
- **[V]** Cross-object `Reference = {kind:'file'|'note'|'board'|'process', id, label, meta?}`; comment: relationships are references by id, never copies. `src/data/types.ts:38-43`. **[A]** This is the closest existing pattern to GSC relationships.

## 6. Reusable patterns (not reusable code)

| Need | Pattern / file |
|---|---|
| Primitives | `src/components/ui.tsx`: Button, IconButton, Chip, StatusDot, Badge, Kbd, SectionLabel, EmptyState, Field, TypeGlyph |
| Icons | `src/components/icons.tsx` — ~45 hand-written 16px named icons |
| Empty state | `EmptyState{title,hint,action}`; must name what would be there, not "no data" (`docs/design/component-guidelines.md:33`) |
| Relationship display | `src/pages/coworkers/CoworkerDetail.tsx:102-136`, `src/pages/artifacts/artifacts.module.css` |
| Timeline | `src/pages/Processes.tsx:366-415` — `<ol>` + time gutter + mark + text + meta |
| Inline new/delete | `src/pages/workspaces/WorkspaceGrid.tsx:32-140` — no modal |
| Dialog | `src/shell/CommandPalette.tsx:107-114` — only when truly modal |
| Panel | `src/shell/ContextPanel.tsx`, `src/shell/layouts.tsx` |
| Shared recipes | `src/styles/grammar.module.css` |

- **[V]** No generic `Table`, `Card`, `Modal`, or `Tabs` component by explicit decision. `docs/design/component-guidelines.md:75-85`.

## 7. Backend and data conventions

- **[V]** No web framework. `createServer` from `node:http` in `server/index.ts:12-25`; shared `createApiRouter()` in `server/router.ts:34-69`; also mounted as Vite middleware (`server/ai.ts:18-33`).
- **[V]** Drizzle ORM + `pg`, PostgreSQL dialect. `drizzle.config.ts:8-15`, `server/persistence/client.ts:6-21`.
- **[V]** Only 3 tables: `conversations` (`schema.ts:26-41`), `messages` (`:43-61`), `files` (`:68-83`). No User / Workspace / Coworker / Artifact / Activity tables. **[D]** Those are Phase 2 plans in `server/persistence/schema.ts:6-16` and `docs/development/backend/AUDIT.md:122`.
- **[N]** pgvector, vector columns, HNSW/IVFFlat — absent.
- **[V]** API error contract: `{ok:false, kind, message, retryable}`; `sendJson()` sets no-store JSON. `server/http.ts:17-24`.
- **[V]** Contracts live in `src/lib/<domain>.ts`, imported by both server and client. TS types + small shape-check functions; no zod, no codegen. `docs/development/backend/ENGINEERING-STANDARDS.md:14-24`.
- **[V]** Session source is replaceable: dev cookie `thylas_session = dev:<userId>:<workspaceIds>`; with `CHORD_ISSUER` set, protected endpoints fail closed 401. `server/session/source.ts:33-49`.
- **[V]** Tests: Vitest, `environment:'node'`, `src/**/*.test.ts` + `server/**/*.test.ts`. `vitest.config.ts:3-10`.

## 8. Documentation rules

- **[V]** Root rule file is `AGENT.md` (463 lines); it requires boundary investigation before implementation and explicit decision labels. `AGENT.md:357-382,414-427`.
- **[V]** `docs/README.md` is the doc index with a fixed reading order and a decision register (Confirmed / Proposed / Unresolved / Rejected). `docs/README.md:9-37,80-132`.
- **[V]** `docs/product/gsc/` contains exactly one file: `MANIFESTO.md` (179 lines). `docs/product/gsc/MANIFESTO.md`.
- **[D]** Manifesto assertions used here: six information properties (§2), independence from WAM/LLM/orchestration (§5), eight design principles (§6), what GSC is not (§7).

## 9. Documentation drift found — trust code

| Topic | Docs say | Code says |
|---|---|---|
| Dark mode | "no dark mode in v1" (`docs/design/visual-system.md:110`) | implemented, 3 themes (`src/styles/themes.css:62`) |
| UI font | IBM Plex Sans (`docs/design/typography.md:69-82`) | Inter Variable (`src/styles/typography.css:12`) |
| `--t-page` | 24/32 | 20/28 (`typography.css:16-24`) |
| Routes | migration to react-router 8 proposed | still react-router-dom 7.1.1 |
| `thinking.md` | missing (`docs/README.md:68`) | exists as `THINKING.md` |

## 10. Minimum practical stack for GSC — `DECIDED` 2026-11-16

| Layer | Choice | Reason |
|---|---|---|
| Build/UI | Vite + React + TypeScript + CSS Modules + own token file | Matches known conventions; no new UI dependency |
| Routing | react-router | Only if a multi-view prototype is needed; single-page with view state also acceptable |
| State | React state + small module store pattern | No third-party state library in reference |
| API | `node:http` thin server, shared contract modules | Proven in Thylas; no framework dependency |
| Persistence | Drizzle ORM, PostgreSQL dialect | Preferred by brief; compatible with Thylas conventions |
| Local DB | Docker PostgreSQL 16/17 | No local PG reachable; Docker 29.1.5 available (`DECISION_LOG.md` D-004, `DECIDED`) |
| Tests | Vitest, node environment | Same as reference |

Not proposed: Tailwind, UI kit, zod, vector DB, graph DB, queues, microservices.

## 11. Assumptions to validate, not facts

- **[A]** Thylas Overview section can be added later without reshaping the Overview page.
- **[DECIDED]** Standalone prototype app rendering an Overview-style section; visual rules mirrored, code not imported (`D-010`).
- **[A]** The `Reference`-by-id pattern scales to GSC relationship types; not yet proven.
- **[A]** Docker can actually start a PostgreSQL container in this environment; binary is present but no container was started during Phase 00.
