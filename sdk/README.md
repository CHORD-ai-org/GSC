# GSC SDK (JS)

Thin fetch client for GSC API v1 (`API_CONTRACT.md`). No dependencies.

```js
import { GscClient } from './gsc.mjs';

const gsc = new GscClient({
  baseUrl: 'http://127.0.0.1:8788',
  token: process.env.GSC_API_TOKEN, // only when GSC_AUTH_REQUIRED=1
});

const { items } = await gsc.listChunks({ q: 'chunking' });
const detail = await gsc.getChunk(items[0].id);          // item + relations + events
await gsc.createProposal({
  kind: 'semantic_name',
  target_id: items[0].id,
  proposed_value: 'Chunking beats long context',
  rationale: 'user request in coding session',
});
```

Available methods: `listChunks({type,domain,q})`, `getChunk(id)`, `search(q)`, `listClusters()`, `listContexts()`, `getContext(id)`, `createProposal(body)`, `resolveProposal(id, status)`.

Python SDK is deferred (PLAN-6 B6-2); the MCP server covers agent-CLI consumption in the meantime.
