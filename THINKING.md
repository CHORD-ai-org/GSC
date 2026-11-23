# THINKING.md — Active Task

> Last updated: 2026-11-21
> Standing instruction: read this file before every answer in this workspace.
> Status: **Phase 07 V3 归因与提案面完成（M3，D-091）**：actor 穿线（提案接受=agent+via 标注）、computeAttribution、详情归因条/字段圆点/内嵌提案三键行，vitest 140/140。下一步 V4 空间工作台（⚠️ 待 Q-E 档位拍板）→ V5 闭环留证。

## User approvals received 2026-11-16

1. Enter Phase 01 (documentation only; no implementation code).
2. Local persistence: Docker PostgreSQL (`DECISION_LOG.md` D-004 → `DECIDED`).
3. Recommended stack confirmed (`D-005` → `DECIDED`).
4. UI placement: standalone app + Overview-style section (`D-010` → `DECIDED`).
5. "开始执行Phase 02" — enter Phase 02 (interaction design + UI prototype; still no persistence code).
6. "开始执行" — approve D-022…D-025 and execute Phase 03.
7. "开始执行" — approve Phase 04 plan (D-027…D-029) on 2026-11-19.
8. "制定计划，实现这个UI（记得把截图保存下来）" — 2026-11-19: plan + implement the new UI from four screenshots; D-030…D-035 recorded; former Phase 05 (evaluation) renumbered to Phase 06.

## Completed work

- Phase 00: repository and Thylas audit; 12 documents created; report delivered.
- Phase 01: information model finalized; 4 model/taxonomy documents.
- Phase 02:
  - `MVP_USER_FLOWS.md` — 8 workflows (F1–F8), 4 scenario walks, navigation hierarchy
  - `MVP_UI_SPECIFICATION.md` — screens S1–S7, tokens, components, closed UI decisions
  - `ui-prototype/index.html` — self-contained interactive prototype, in-memory only
  - D-019/D-020/D-021 closed the three Phase 01 UI questions

## Decision labels in use

`DECIDED` · `PROPOSED` · `OPEN` · `DEFERRED`. Never upgrade `PROPOSED` to `DECIDED` without user confirmation.

## Verified facts carried into Phase 03

- Thylas has GSC only as one manifesto file: `docs/product/gsc/MANIFESTO.md`. No GSC code, route, store, section, table, or API exists there.
- Thylas stack: Vite 6 + React 19 + React Router 7 + TypeScript 5.7 + CSS Modules + design tokens; no Tailwind, no UI kit, no state library.
- Thylas backend: `node:http` thin server, shared `createApiRouter()`, Drizzle ORM + `pg`, PostgreSQL dialect, 3 tables, no pgvector.
- API contract pattern: `src/lib/<domain>.ts` shared by server and client; TS types + small shape-check functions; no zod.
- Local environment: Node v22.22.2, Docker 29.1.5 available; no reachable PostgreSQL; no container started.
- Prototype verified at 1440×900 via headless Chrome: Library, New form, and Contexts screens render without overlap.

## Phase 03 completed (2026-11-18)

Implemented app, shared contracts, `node:http` API, Drizzle schema, PGlite persistence, repositories, CRUD, relations, provenance/history, file import, filters, tests, API smoke and UI screenshots. Verified: check/test/build pass; 16 tests; 4 tables; restart persistence. Docker daemon unavailable → PGlite fallback `D-026`.

## Phase 04 completed (2026-11-19)

Implemented P4-0…P4-4. `contexts` + `context_members` persist explicit Knowledge Context membership. UI supports create/edit context, add/remove members and opening member item detail. Verified: check/test/build pass; 20 tests; 6 tables; 10 API smoke checks; screenshots; restart persistence. `CONTEXT_VIEWS.md` defines the Context Space vs View boundary.

## Phase 05 in progress (2026-11-19)

Plan: `PHASE_05_UI_PLAN.md` (P5-0…P5-6, milestones M1–M6). Requirements read literally from `ui-prototype/refs/`: light shell with the real sidebar list + Sync, Overview composer (models Deepseek/Rym), Canvas window (搜索或输入操作 / 画布预览 / 打开文件 Ctrl+O), page-switch mosaic animation, mouse dot-grid background with quality Off/Low/Medium/High/Max. Open questions Q1–Q4 in plan §7 have defaults taken.

## Next action after approval

User to pick from `DIVERGENCE_PLAN.md` §4 (priority order, D1 provider form, D2 delivery form), then write task cards for the chosen direction(s). Phase 06 (formerly 05) — execute scenarios A–D with observed results — stays gated on user approval.

## UI/backend optimization plan drafted (2026-11-23)

`UI_BACKEND_OPTIMIZATION_PLAN.md` (Status: `PROPOSED`) — architecture-deepening plan produced with the mattpocock/skills improve-codebase-architecture + codebase-design method (deep-module vocabulary). Candidates: B1 route handler pipeline, B2 authorize module (fixes list-level IDOR on GET /api/contexts|clusters|sources), B3 updateItem transaction, U1 client data layer (25× try/catch + hand-picked invalidation), U2 collections merge + URL filter state, U3 ItemFields vocabulary, U4 flaky test baseline (vitest 138/140 wobbles). Batches: A (U4→B3) → B (B1→B2) → C (U1→U3→U2). Open decisions: ordering vs Phase 07 V4 (V3 itself landed 2026-11-23 as D-091, no conflict), hide-vs-forbid policy, soft-delete scope. Awaiting user pick.

## Registration receipt demo completed (2026-11-22)

`RECEIPT_DEMO_PLAN.md` + D-089: self-written `ReceiptPrinter` (出纸 + 可撕下收据, zero new deps, per user「不要API Key，你自己写效果」; React Bits Pro install path reverted). Create-account flow prints a registration receipt (name/email/identity/time/order/barcode), tear off or Continue → workspace. Verified end-to-end via `scripts/shot-receipt.mjs` (4 screenshots). Gotcha: sheet in-flow text needs `z-index:1` over the paper-SVG frame.
