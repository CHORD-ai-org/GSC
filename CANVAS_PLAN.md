# GSC Overview Canvas — Expandable Information Tree · Execution Plan

> Status: `PROPOSED` (2026-11-21). Per AGENTS.md, implementation starts only after user approval.
> Vision: `GSC Overview Canvas` doc. Core principle: **Canvas tree is a navigational projection of
> the Information Space, not the underlying data model** — canonical GSC data stays untouched.

## Task card (AGENTS.md §3)

1. **Purpose** — Let users progressively explore their accumulated information as an expandable
   tree (root → domains → categories → objects), instead of flat lists.
2. **Scope** — Canvas mode on Overview (Overview | Canvas toggle), expandable tree, select→detail,
   pan/zoom/fit, breadcrumbs, search. **Excludes** graph editing, canonical mutations, new deps.
3. **Interacts with** — `src/services/api.ts` (listItems/listClusters/listContexts), `src/lib/items.ts`
   (ItemTypes), `src/views/pages.tsx` (Overview), `src/app/App.tsx` (nav), `src/app/routes.ts`.
4. **Does not own** — canonical data model, item/cluster/context CRUD, relations semantics as data,
   backend storage. Canvas reads via existing APIs only.
5. **User flow** — Overview → Canvas → see root `My Information Space` → expand → Raw/Objects/
   Clusters/Contexts → expand domain → categories → objects → click object → existing detail page.
6. **Minimum implementation** — deterministic frontend tree layout + expand/collapse/select +
   pan/zoom + node states + breadcrumb. Real data, no fabrication.
7. **Test method** — `npm run check`/`test`/`build`; manual: root→object navigation, collapse/reopen,
   pan/zoom, empty/error states, data isolation; screenshots 1440×900 + small viewport.

## Phase A — Audit (done)

| Area | Finding |
|---|---|
| Overview | `pages.tsx` OverviewPage (stat cards/proposals/badge cloud). No tree. |
| Canvas today | `views.tsx:307` CanvasView = search/preview **card grid**, NOT a tree (unrelated). |
| Routing | URL router live (`routes.ts`): `/overview`, `/canvas`. Deep-linkable. |
| Data model | `items(raw.*\|object.*)`, `clusters(+member_ids)`, `contexts(+member_ids)`, `relations`. |
| API | `src/services/api.ts`: `listItems({type,domain,q})` (type filter!), `listClusters()`, `listContexts()`, `getContext/getCluster`, search. **No new endpoints needed.** |
| Item types | raw: document/message/evidence/filecontent · object: concept/hypothesis/methodology/decision/evidencereference |
| Stack | React+Vite+CSS Modules, zero-dep. Quiet-editorial visual language (recent color-block/radius work). |

## Phase B — Architecture & Design

### Canvas node (visualization-only, separate from canonical entities)
```ts
type CanvasNode = {
  id: string;               // stable path-based key, e.g. 'root/raw/raw.document/itm_123'
  kind: 'root' | 'domain' | 'category' | 'object' | 'reference';
  label: string;            // semantic name / category name
  itemType?: ItemType;      // for object/reference nodes
  count?: number;           // real count where available (0 = none, omit if unknown)
  hasChildren: boolean;
  expanded: boolean;
  selected: boolean;
  refTargetId?: string;     // reference node → canonical object id (no duplication)
  children: CanvasNode[];
  x?: number; y?: number;   // layout coords (frontend-computed)
};
```

### Tree vs graph semantics (vision §5)
- **No single-parent implication.** A Chunk in multiple Clusters/Contexts appears once as an
  `object` node (first path) and as `reference` nodes on other paths (`refTargetId`, distinct look).
- **No canonical duplication.** Reference nodes navigate to the existing object; they are not stored.
- **Containment ≠ relations.** Tree uses membership (cluster/context `member_ids`) + type grouping.
  `relations` (derived_from etc.) are out of tree scope for MVP.
- **Expanding/collapsing mutates nothing** (pure frontend state).

### Expansion / layout / interaction
- **State** (frontend only): `expandedIds: Set<string>`, `selectedId`, `pan{x,y}`, `zoom`, `query`.
- **Layout**: deterministic recursive tree (horizontal levels, parent→right). New nodes render near
  parent (incremental — never reshuffle the whole canvas). Computed on frontend; no data writes.
- **Rendering**: SVG for quiet connection lines + absolutely-positioned node chips (CSS Modules).
  Pan via drag translate, zoom via wheel scale, `fit` resets to root.
- **Breadcrumbs**: current expansion path (root → … → selected).
- **Search**: reuse `listItems({q})` to locate an object → reveal its path + select.
- **Progressive**: on open, show root + first-level domains only; lazy-expand deeper.

### Node visual (Quiet Intelligence × Editorial Craft)
- Restrained neutral palette (reuse tokens), subtle node borders + connection lines, consistent
  spacing, clear hierarchy (semantic name > type/category > count).
- **Distinct states**: collapsed / expanded / selected / reference / leaf (no children).
- Avoid: large rounded dashboard cards, neon, glow, gradients, glassmorphism, decorative animation.
- Short predictable transitions only on expand/collapse/navigate.

## Phase C — Implementation (milestones)

- **M1 · Model + Layout** — `src/lib/canvasModel.ts` (buildTree: canonical→CanvasNode, reference
  dedup, real counts) + `src/lib/canvasLayout.ts` (deterministic coords). Pure, unit-testable.
- **M2 · Tree component** — `src/views/CanvasTreeView.tsx` (SVG lines + node chips, expand/collapse/
  select, node states) + CSS. Wire root→domains lazy.
- **M3 · Interaction** — pan/zoom/fit, breadcrumbs, search-to-object, keyboard a11y (expand/collapse).
- **M4 · Overview integration** — Overview `Overview | Canvas` toggle (PROPOSED: Canvas as Overview
  mode; reuse `/canvas` route to render tree, keeping deep-link). Select→`onOpenItem` (existing detail
  routing). Empty/loading/error states.
- **M5 · Polish** — large-node-set usability (windowed/level-capped), reduced-motion, small-viewport.

## Phase D — Verification
- Root / domain / category / object expansion; object→detail navigation; collapse & reopen without
  losing exploration; pan/zoom/fit; empty + loading + API error states; user data isolation;
  existing Overview intact.
- `npm run check` (tsc=0) · `npm test` · `npm run build`. Screenshots 1440×900 + ≤900px wide.

## Decisions (need confirmation before coding)
- **D-079 `PROPOSED`** — Canvas as an **Overview mode** (Overview | Canvas toggle) per vision §3;
  deterministic zero-dep frontend tree layout (no react-flow/d3); reference-node dedup for multi-parent
  objects; membership-based containment (relations deferred). Reuses existing APIs — **no backend
  change, no new dependency, no canonical data model change**.

## Out of Scope (vision §9)
Arbitrary graph editing · creating/deleting objects via Canvas · drag-drop ownership · auto semantic
relationship discovery · AI categories · full graph viz · cross-user shared graph · graph DB ·
Overview redesign · Canvas persistence/collaboration.

## Deliverables (vision §11)
Audit findings (above) · this design · files changed · no new deps · no API changes · implemented
features · known limitations · verification + screenshots · next steps.
