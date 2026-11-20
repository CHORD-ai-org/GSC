# API_CONTRACT.md — GSC API v1 (frozen)

Status: `DECIDED` — 2026-11-20 (D-060). The v1 surface is locked; additive changes only. Enforcement = the router test suite (`server/router.test.ts`).

Base path: `/api/v1/*` (the unversioned `/api/*` remains a working alias). Auth (D-058): `Authorization: Bearer <token>` when `GSC_AUTH_REQUIRED=1`; `read` scope covers `GET`, `rw` covers everything.

Type sources of truth: `src/lib/{items,relations,events,contexts,clusters,proposals,sources}.ts` — DTOs and validators there define the shapes below.

## Error shape (all failures)

```json
{ "ok": false, "kind": "<contract|not_found|duplicate|conflict|db_unavailable|internal>", "message": "...", "retryable": false }
```

| kind | HTTP |
|---|---|
| contract | 400 |
| not_found | 404 |
| duplicate / conflict | 409 |
| db_unavailable | 503 |
| internal | 502 |

## Endpoints

| Method | Path | Body / query | Success |
|---|---|---|---|
| GET | `/items` | `?type=&domain=&q=` | `{ ok, items: ItemDTO[] }` (fields populated) |
| POST | `/items` | CreateItemBody | 201 `{ ok, item }` |
| GET | `/items/:id` | — | `{ ok, item, relations:{outgoing,incoming}, events }` |
| PATCH | `/items/:id` | UpdateItemBody | `{ ok, item }` |
| DELETE | `/items/:id` | — | `{ ok, deleted: true }` (cascades relations/events/memberships) |
| POST | `/relations` | CreateRelationBody | 201 `{ ok, relation }` |
| GET/POST | `/contexts` | CreateContextBody | `{ ok, contexts }` / 201 `{ ok, context }` |
| GET/PATCH | `/contexts/:id` | UpdateContextBody | `{ ok, context }` (detail has `member_ids`) |
| POST/DELETE | `/contexts/:id/members` | `{ item_id }` | `{ ok, context }` |
| GET/POST | `/clusters` | CreateClusterBody | `{ ok, clusters }` / 201 `{ ok, cluster }` |
| GET/PATCH/DELETE | `/clusters/:id` | UpdateClusterBody | `{ ok, cluster }` / `{ ok, deleted }` |
| POST/DELETE | `/clusters/:id/members` | `{ item_id }` | `{ ok, cluster }` |
| GET | `/proposals` | `?status=` | `{ ok, proposals }` |
| POST | `/proposals` | CreateProposalBody | 201 `{ ok, proposal }` |
| POST | `/proposals/:id/resolve` | `{ status: accepted\|rejected }` | `{ ok, proposal }` — accepted applies per D-054 |
| GET/POST | `/sources` | CreateSourceBody | `{ ok, sources }` / 201 `{ ok, source }` |
| PATCH/DELETE | `/sources/:id` | UpdateSourceBody | `{ ok, source }` / `{ ok, deleted }` |
| POST | `/sources/:id/sync` | — | `{ ok, result: { imported, skipped } }` |
| POST | `/ingest/url` | `{ url }` | `{ ok, url, title, text }` (fetch-and-preview only) |
| POST | `/agent/propose` | `{ chunks: [{title,content}] }` | `{ ok, suggestions }` (needs `GSC_LLM_*`) |
| POST | `/agent/detect` | — | `{ ok, report: { dedupe, metadata, association } }` |

## Consumers

| Consumer | Surface |
|---|---|
| Web app | `src/services/api.ts` (this contract) |
| MCP (Claude Code / Codex / Pi Agent) | `server/mcp/index.ts` over stdio, calling this API |
| Node SDK | `sdk/gsc.mjs` |
| Offline fallback | Export page / `GSC-CONTEXT.md` |

History semantics: every create/update/accept-applying mutation appends exactly one event; `origin` is descriptive (`user | import | agent`), never a trust level.
