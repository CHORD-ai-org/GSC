/**
 * MCP tool registry (M-1) — the single source of truth for the GSC MCP tool
 * surface. Shared by the stdio server (mcp/index.ts) and the HTTP API
 * (GET /api/meta/mcp) so the Settings UI can never drift from tools/list.
 */

export type McpAnnotations = {
  readOnlyHint?: boolean;
  idempotentHint?: boolean;
  destructiveHint?: boolean;
  openWorldHint?: boolean;
};

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: McpAnnotations;
};

export const MCP_SERVER_INFO = { name: 'gsc-mcp', version: '0.3.0' } as const;

const READ_ONLY: McpAnnotations = { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false };

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'gsc_get_chunk',
    description: 'Retrieve one GSC chunk (information unit) by id, with provenance, relations and history.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    annotations: READ_ONLY,
  },
  {
    name: 'gsc_list_chunks',
    description: 'List/search GSC chunks. Optional filters: type (e.g. raw.document, object.concept), domain, q (substring); plus limit/cursor for paging.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        domain: { type: 'string' },
        q: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 200 },
        cursor: { type: 'string' },
      },
    },
    annotations: READ_ONLY,
  },
  {
    name: 'gsc_search',
    description: 'Full-text search across chunk titles, bodies, tag values, clusters and contexts. Returns grouped hits with snippets.',
    inputSchema: {
      type: 'object',
      properties: { q: { type: 'string', minLength: 1 } },
      required: ['q'],
    },
    annotations: READ_ONLY,
  },
  {
    name: 'gsc_browse_clusters',
    description: 'List GSC clusters (related-information groups) with member counts.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 200 }, cursor: { type: 'string' } },
    },
    annotations: READ_ONLY,
  },
  {
    name: 'gsc_get_cluster',
    description: 'Get one cluster (related-information group) with its member chunk ids and ownership/role.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    annotations: READ_ONLY,
  },
  {
    name: 'gsc_browse_contexts',
    description: 'List GSC context views (purpose-oriented assemblies).',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 200 }, cursor: { type: 'string' } },
    },
    annotations: READ_ONLY,
  },
  {
    name: 'gsc_get_context',
    description: 'Get one context view with its explicit member ids.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    annotations: READ_ONLY,
  },
  {
    name: 'gsc_get_user_profile',
    description: 'Read the user profile: user-confirmed values on the User Profile dimension (technical background, coding preferences, working style). Confirmed-only, per PLAN-8 D-066.',
    inputSchema: { type: 'object', properties: {} },
    annotations: READ_ONLY,
  },
  {
    name: 'gsc_propose',
    description: 'Propose an organization change (semantic_name/classification/meta_tag/association/cluster). Proposals await human review; nothing is written directly.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['semantic_name', 'classification', 'meta_tag', 'association', 'cluster'] },
        target_id: { type: 'string' },
        proposed_value: { type: 'string' },
        rationale: { type: 'string' },
        related_id: { type: 'string' },
      },
      required: ['kind', 'target_id', 'proposed_value'],
    },
    // Non-destructive (creates a reviewable proposal) but not read-only and not idempotent.
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false, openWorldHint: false },
  },
];
