# API_CONTRACT.md — GSC API v1 (frozen)

Status: `DECIDED` — 2026-11-20 (D-060). The v1 surface is locked; additive changes only. Enforcement = the router test suite (`server/router.test.ts`).

Base path: `/api/v1/*` (the unversioned `/api/*` remains a working alias). Auth (D-058): `Authorization: Bearer <token>` when `GSC_AUTH_REQUIRED=1`; `read` scope covers `GET`, `rw` covers everything.

Type sources of truth: `src/lib/{items,relations,events,contexts,clusters,proposals,sources}.ts` — DTOs and validators there define the shapes below.

## Error shape (all failures)

```json
{ "ok": false, "kind": "<kind>", "message": "...", "retryable": false }
```

| kind | HTTP | Meaning |
|---|---|---|
| contract | 400 | malformed body / invalid fields / SSRF-refused URL |
| unauthorized | 401 | missing or invalid token (auth mode) |
| forbidden | 403 | valid token but insufficient scope / disallowed origin |
| not_found | 404 | unknown resource |
| method_not_allowed | 405 | known path, wrong method (see `Allow` header) |
| duplicate / conflict | 409 | state conflict |
| payload_too_large | 413 | body exceeds 64 KB |
| rate_limited | 429 | token bucket exhausted (`Retry-After` header, `retryable: true`) |
| db_unavailable | 503 | persistence down (`retryable: true`) |
| internal | 502 | server/upstream failure (`retryable: true`) |

## Cross-cutting (O1 series)

- **Security headers** on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`.
- **CORS**: same-origin only by default; explicit allowlist via `GSC_CORS_ORIGINS` (comma-separated). Disallowed origins → 403. `OPTIONS` preflight → 204.
- **Rate limits** (per token id, or socket address when unauthenticated; single-process store): writes 60/min, `/ingest/*` 10/min, `/agent/*` 5/min. Reads are unlimited.
- **Input limits**: title ≤ 512 chars, field values ≤ 65536, tag values ≤ 2000, scope ≤ 200, long texts ≤ 8000. Exceeding → 400 `contract`.
- **URL ingestion SSRF guard**: http(s) only, no embedded credentials, ports 80/443/8080/8443, DNS-resolved addresses must be public; every redirect hop re-validated (max 3). Dev escape hatch `GSC_INGEST_ALLOW_PRIVATE=1`.

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
