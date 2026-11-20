# GSC Routing System — Design & Task Card

> Decision `D-078`. Goal: give GSC a **commercial-grade, zero-dependency URL router** so views are
> deep-linkable, shareable, and survive browser back/forward. Today navigation is pure React state
> (`go()`), so the address bar never reflects where you are.

## Task card (AGENTS.md §3)

1. **Purpose** — Users can't share/bookmark a GSC view, and the browser Back button breaks (state-only nav).
   Commercial SPAs (Notion/Linear/ChatGPT) drive the view from the URL; GSC must too.
2. **Scope** — Frontend URL router (`src/lib/router.ts`), GSC route table (`src/app/routes.ts`),
   App wiring (state ↔ URL sync, deep-link seed, 404). **Out of scope:** backend API routing
   (`server/router.ts` already exists), view rendering, ephemeral UI (panel/form), data loading.
3. **Interacts with** — `src/lib/router.ts` (new), `src/app/routes.ts` (new), `src/app/App.tsx`
   (nav state: view/selectedId/contextId/clusterId/recentDay), `src/app/Sidebar.tsx` (ViewId),
   `src/lib/strings.ts` (404 copy).
4. **Does not own** — backend routes, item/context/cluster data, panel/modal state, scroll model.
5. **User flow** — type `/raw/itm_123` → raw list with that item open; copy URL → shareable;
   press Back → previous view; visit `/nope` → 404 with a "go home" action.
6. **Minimum implementation** — `matchPath`/`navigate`/`useLocation` + `parsePath`/`buildPath`
   + App sync effects + 404 gate.
7. **Test method** — `npm run check` (tsc=0), `npm test` (routes + router unit tests), `npm run build`;
   manual: deep-link load, back/forward, 404 (headless-Chrome screenshots).

## Architecture

```
URL (History API)  ⇄  App nav state (view/itemId/contextId/clusterId/day)  →  renderMain()
      ↑ navigate/replace                                    mirror (pushState) ↑
```

- **URL is the location truth for shareability.** State is seeded from the URL on load (deep links);
  `popstate` re-derives state (back/forward); state changes mirror to the URL (pushState).
  Bidirectional effects use equality guards → no loops, no history spam.
- **Zero-dependency** (repo principle): hand-rolled `router.ts` (History API + `useSyncExternalStore`),
  no `react-router`. Justification recorded in `DECISION_LOG.md` D-078.
- **Ephemeral UI stays in state** (new/edit panels, forms, toasts) — not routed.

## Route table

| URL | view | detail |
|---|---|---|
| `/` | start | — |
| `/overview` `/lightup` `/sync` `/settings` `/docs` `/user` `/canvas` | same | — |
| `/recently?day=YYYY-MM-DD` | recently | day filter |
| `/raw` · `/raw/:itemId` | raw | item detail |
| `/objects` · `/objects/:itemId` | objects | item detail |
| `/clusters` · `/clusters/:clusterId` | clusters | cluster detail |
| `/contexts` · `/contexts/:contextId` | contexts | context detail |
| anything else | — | **404** |

`parsePath` / `buildPath` are exact inverses (round-trip tested); ids are URL-encoded.

## Deferred / known limitations
- Scroll restoration not implemented (the app scrolls inner containers, not `window`); safe to add later.
- Sub-tab state inside Settings/Sync views is component-local and not routed (only App-level location is).
- Vite `base` is `/`; if deployed under a sub-path, set `base` and pass it to `navigate` resolution.

## Verification
- `npm run check` → 0 errors. `npm test` → all green (incl. `routes.test.ts`, `router.test.ts`).
- `npm run build` passes. Deep-link / back-forward / 404 verified via screenshots (`routing-*.png`).
