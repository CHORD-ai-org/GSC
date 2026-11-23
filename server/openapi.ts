/**
 * OpenAPI 3.1 document for the GSC API (INTEGRATION_HARDENING P1).
 * Paths are derived from `KNOWN_ROUTES` so the spec cannot drift from the
 * router's method gate; curated metadata supplies summaries and schemas.
 */
import { KNOWN_ROUTES } from './router.ts';

/** Regex source → OpenAPI path template: `/api/items/([^/]+)` → `/api/items/{id}`. */
export function routeToPath(source: string): string {
  return source
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    // B1: table patterns use capture groups; accept bare and parenthesized forms.
    .replace(/\(\[\^\/\]\+\)|\[\^\/\]\+/g, '{id}')
    .replace(/\\\//g, '/');
}

type Meta = { summary: string; tag: string; body?: string; response?: string };

const META: Record<string, Partial<Record<string, Meta>>> = {
  '/api/items': {
    get: { summary: 'List raw information and structured objects (keyset pagination)', tag: 'Items', response: 'ItemListResponse' },
    post: { summary: 'Create an item (raw.* or object.*)', tag: 'Items', body: 'CreateItemBody', response: 'ItemResponse' },
  },
  '/api/items/{id}': {
    get: { summary: 'Get one item with relations', tag: 'Items', response: 'ItemDetailResponse' },
    patch: { summary: 'Update item fields/title/status', tag: 'Items', body: 'UpdateItemBody', response: 'ItemResponse' },
    delete: { summary: 'Soft-delete an item (restorable from trash)', tag: 'Items' },
  },
  '/api/items/{id}/restore': { post: { summary: 'Restore a soft-deleted item', tag: 'Items' } },
  '/api/items/{id}/purge': { post: { summary: 'Permanently delete an item', tag: 'Items' } },
  '/api/search': { get: { summary: 'Full-text search across items, clusters, contexts, tag values', tag: 'Search' } },
  '/api/trash': { get: { summary: 'List soft-deleted items', tag: 'Items' } },
  '/api/contexts': {
    get: { summary: 'List contexts', tag: 'Contexts', response: 'ContextListResponse' },
    post: { summary: 'Create a Knowledge Context', tag: 'Contexts', body: 'CreateContextBody' },
  },
  '/api/contexts/{id}': {
    get: { summary: 'Get a context with members', tag: 'Contexts', response: 'ContextDetailResponse' },
    patch: { summary: 'Update context metadata', tag: 'Contexts' },
    delete: { summary: 'Delete a context', tag: 'Contexts' },
  },
  '/api/contexts/{id}/members': {
    post: { summary: 'Add an item to the context (explicit reference)', tag: 'Contexts' },
    delete: { summary: 'Remove an item from the context', tag: 'Contexts' },
  },
  '/api/clusters': {
    get: { summary: 'List clusters', tag: 'Clusters', response: 'ClusterListResponse' },
    post: { summary: 'Create a cluster', tag: 'Clusters', body: 'CreateClusterBody' },
  },
  '/api/clusters/{id}': {
    get: { summary: 'Get a cluster with members', tag: 'Clusters', response: 'ClusterDetailResponse' },
    patch: { summary: 'Update cluster', tag: 'Clusters' },
    delete: { summary: 'Delete a cluster', tag: 'Clusters' },
  },
  '/api/clusters/{id}/members': {
    post: { summary: 'Add an item to the cluster (many-to-many)', tag: 'Clusters' },
    delete: { summary: 'Remove an item from the cluster', tag: 'Clusters' },
  },
  '/api/clusters/{id}/shares': {
    get: { summary: 'List cluster shares', tag: 'Sharing' },
    post: { summary: 'Share a cluster with a user (role: view|add)', tag: 'Sharing' },
  },
  '/api/clusters/{id}/shares/{id}': { delete: { summary: 'Revoke a cluster share', tag: 'Sharing' } },
  '/api/proposals': {
    get: { summary: 'List machine proposals awaiting review', tag: 'Proposals' },
    post: { summary: 'Create a proposal (agent/detector)', tag: 'Proposals' },
  },
  '/api/proposals/{id}/resolve': { post: { summary: 'Accept/reject/defer a proposal', tag: 'Proposals' } },
  '/api/sources': {
    get: { summary: 'List acquisition sources', tag: 'Sources', response: 'SourceListResponse' },
    post: { summary: 'Register a source (web/rss/file/github/notion/drive/x)', tag: 'Sources' },
  },
  '/api/sources/{id}': {
    patch: { summary: 'Update source (status/frequency/scope)', tag: 'Sources' },
    delete: { summary: 'Delete a source (and its token)', tag: 'Sources' },
  },
  '/api/sources/{id}/sync': { post: { summary: 'Sync a source now (adapter pipeline)', tag: 'Sources' } },
  '/api/ingest/url': { post: { summary: 'Fetch a URL for preview (no persistence)', tag: 'Capture' } },
  '/api/capture': {
    get: { summary: 'List recent capture tasks with real stages', tag: 'Capture', response: 'CaptureTaskListResponse' },
    post: { summary: 'Capture a URL: fetch → extract → persist raw item + proposals', tag: 'Capture' },
  },
  '/api/capture/{id}': { get: { summary: 'Get capture task status', tag: 'Capture' } },
  '/api/agent/propose': { post: { summary: 'LLM semantic naming/classification proposals', tag: 'Agent' } },
  '/api/agent/detect': { post: { summary: 'Run the detector (candidate relations/tags)', tag: 'Agent' } },
  '/api/users': {
    get: { summary: 'List users', tag: 'Users' },
    post: { summary: 'Create a local user', tag: 'Users' },
  },
  '/api/users/{id}': { delete: { summary: 'Delete a user and their data', tag: 'Users' } },
  '/api/tags/definitions': {
    get: { summary: 'List tag definitions (controlled dimensions)', tag: 'Tags' },
    post: { summary: 'Create a tag definition', tag: 'Tags' },
  },
  '/api/tags/values': {
    get: { summary: 'List tag values', tag: 'Tags' },
    post: { summary: 'Assign a tag value (scoped, idempotent)', tag: 'Tags' },
  },
  '/api/tags/values/{id}': {
    patch: { summary: 'Update a tag value', tag: 'Tags' },
    delete: { summary: 'Remove a tag value', tag: 'Tags' },
  },
  '/api/profile': { get: { summary: 'Aggregated user profile (confirmed tag values)', tag: 'Users' } },
  '/api/llm/config': {
    get: { summary: 'Public LLM provider config (key material never returned)', tag: 'LLM', response: 'LlmConfigResponse' },
    patch: { summary: 'Set provider/base_url/model/api_key (per-provider key slots)', tag: 'LLM', body: 'LlmConfigPatch' },
  },
  '/api/llm/check': { post: { summary: 'Provider connectivity probe', tag: 'LLM' } },
  '/api/news': {
    get: { summary: 'List news items', tag: 'News' },
    post: { summary: 'Publish a news item (admin)', tag: 'News' },
  },
  '/api/news/{id}': {
    patch: { summary: 'Edit/unpublish a news item', tag: 'News' },
    delete: { summary: 'Delete a news item', tag: 'News' },
  },
  '/api/tokens': {
    get: { summary: 'List API tokens (metadata only)', tag: 'Tokens' },
    post: { summary: 'Mint an API token (plaintext returned once)', tag: 'Tokens' },
  },
};

const SCHEMAS: Record<string, unknown> = {
  ApiError: {
    type: 'object',
    properties: { ok: { type: 'boolean' }, error: { type: 'object', properties: { code: { type: 'string', enum: ['contract', 'unauthorized', 'forbidden', 'not_found', 'conflict', 'rate_limited', 'internal'] }, message: { type: 'string' } }, required: ['code', 'message'] } },
    required: ['ok', 'error'],
  },
  ItemFields: { type: 'object', additionalProperties: true, description: 'Typed fields; required keys depend on the item type' },
  CreateItemBody: {
    type: 'object',
    required: ['type', 'title'],
    properties: {
      type: { type: 'string', enum: ['raw.document', 'raw.message', 'raw.evidence', 'raw.filecontent', 'object.concept', 'object.hypothesis', 'object.methodology', 'object.decision', 'object.evidencereference'] },
      title: { type: 'string', maxLength: 300 },
      domain: { type: 'string' },
      origin: { type: 'string', enum: ['user', 'agent', 'import'] },
      source_label: { type: 'string' },
      fields: { $ref: '#/components/schemas/ItemFields' },
    },
  },
  UpdateItemBody: { type: 'object', properties: { title: { type: 'string' }, fields: { $ref: '#/components/schemas/ItemFields' }, status: { type: 'string', enum: ['draft', 'active', 'superseded', 'outdated'] } } },
  ItemDTO: {
    type: 'object',
    properties: {
      id: { type: 'string' }, type: { type: 'string' }, title: { type: 'string' },
      domain: { type: 'string' }, origin: { type: 'string' }, source_label: { type: 'string' },
      status: { type: 'string' }, fields: { $ref: '#/components/schemas/ItemFields' },
      created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'type', 'title'],
  },
  CreateRelationBody: { type: 'object', required: ['from_id', 'to_id', 'kind'], properties: { from_id: { type: 'string' }, to_id: { type: 'string' }, kind: { type: 'string', enum: ['derived_from', 'references', 'related_to', 'supports', 'challenges', 'superseded_by'] }, note: { type: 'string' } } },
  CreateContextBody: { type: 'object', required: ['title', 'subject', 'scope', 'purpose'], properties: { title: { type: 'string' }, subject: { type: 'string' }, scope: { type: 'string' }, purpose: { type: 'string' } } },
  CreateClusterBody: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, description: { type: 'string' } } },
  LlmConfigPatch: { type: 'object', properties: { provider: { type: 'string' }, base_url: { type: 'string', format: 'uri' }, model: { type: 'string' }, api_key: { type: 'string', writeOnly: true } } },
  LlmConfigResponse: { type: 'object', properties: { ok: { type: 'boolean' }, config: { type: 'object', properties: { provider: { type: 'string' }, base_url: { type: 'string' }, model: { type: 'string' }, key_set: { type: 'boolean' }, key_hint: { type: 'string' }, key_status: { type: 'object', additionalProperties: { type: 'boolean' } } } } } },
};

export function buildOpenApi(): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of KNOWN_ROUTES) {
    const openPath = routeToPath(route.pattern.source);
    const methods = (openPath === '/api/clusters/{id}/shares/{id}'
      ? route.methods.filter((m) => m === 'DELETE')
      : route.methods
    ).map((m) => m.toLowerCase());
    // Disambiguate the trailing share-revoke route from its list sibling.
    const key = route.pattern.source.includes('shares\\/\\[\\^\\/\\]\\+$')
      ? '/api/clusters/{id}/shares/{shareUserId}'
      : openPath;
    const entry = paths[key] ?? {};
    for (const method of methods) {
      const meta = META[openPath]?.[method] ?? META[key]?.[method];
      entry[method] = {
        summary: meta?.summary ?? `${method.toUpperCase()} ${key}`,
        tags: [meta?.tag ?? 'General'],
        ...(meta?.body ? { requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${meta.body}` } } } } } : {}),
        responses: {
          200: { description: 'OK', ...(meta?.response ? { content: { 'application/json': { schema: { $ref: `#/components/schemas/${meta.response}` } } } } : {}) },
          400: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      };
    }
    paths[key] = entry;
  }
  // Ops endpoints live outside KNOWN_ROUTES' /api gate.
  paths['/healthz'] = { get: { summary: 'Liveness probe', tags: ['Ops'], responses: { 200: { description: 'OK' } } } };
  paths['/readyz'] = { get: { summary: 'Readiness probe', tags: ['Ops'], responses: { 200: { description: 'OK' } } } };
  paths['/metrics'] = { get: { summary: 'Prometheus metrics', tags: ['Ops'], responses: { 200: { description: 'Prometheus text format' } } } };

  return {
    openapi: '3.1.0',
    info: {
      title: 'GSC API',
      version: '1.0.0',
      description: 'Global Shared Context — persistent information infrastructure. Auth: `Authorization: Bearer <token>` (read/rw scopes). All machine-generated interpretations are proposals until confirmed.',
    },
    servers: [{ url: 'http://127.0.0.1:8788', description: 'Local API server' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', description: 'GSC API token (mint via POST /api/tokens)' } },
      schemas: SCHEMAS,
    },
    security: [{ bearerAuth: [] }],
    paths,
  };
}
