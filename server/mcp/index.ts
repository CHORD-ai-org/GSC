/**
 * GSC MCP server (D-059): minimal stdio JSON-RPC 2.0 surface —
 * initialize / tools/list / tools/call — backed by the GSC HTTP API
 * (never opens PGlite directly; one domain contract, see API_CONTRACT.md).
 * Run: GSC_API_TOKEN=... npm run mcp
 */
import { createInterface } from 'node:readline';

const BASE = (process.env.GSC_API_URL ?? 'http://127.0.0.1:8788').replace(/\/$/, '');
const TOKEN = process.env.GSC_API_TOKEN ?? '';

type JsonRpc = { jsonrpc: '2.0'; id?: number | string | null; method?: string; params?: Record<string, unknown> };

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'gsc_get_chunk',
    description: 'Retrieve one GSC chunk (information unit) by id, with provenance, relations and history.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'gsc_list_chunks',
    description: 'List/search GSC chunks. Optional filters: type (e.g. raw.document, object.concept), domain, q (substring).',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        domain: { type: 'string' },
        q: { type: 'string' },
      },
    },
  },
  {
    name: 'gsc_browse_clusters',
    description: 'List GSC clusters (related-information groups) with member counts.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'gsc_browse_contexts',
    description: 'List GSC context views (purpose-oriented assemblies).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'gsc_get_context',
    description: 'Get one context view with its explicit member ids.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'gsc_get_user_profile',
    description: 'Read the user profile: user-confirmed values on the User Profile dimension (technical background, coding preferences, working style). Confirmed-only, per PLAN-8 D-066.',
    inputSchema: { type: 'object', properties: {} },
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
  },
];

export function createMcpHandler(fetchImpl: FetchLike = fetch, baseUrl: string = BASE, token: string = TOKEN) {
  return async function handle(msg: JsonRpc): Promise<object | null> {
    const reply = (result: unknown) => ({ jsonrpc: '2.0', id: msg.id ?? null, result });
    const call = async (path: string, init?: RequestInit) => {
      const res = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
      });
      const body = await res.json();
      if (!res.ok || body.ok === false) throw new Error(body.message ?? `HTTP ${res.status}`);
      return body;
    };

    switch (msg.method) {
      case 'initialize':
        return reply({
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'gsc-mcp', version: '0.1.0' },
        });
      case 'notifications/initialized':
        return null;
      case 'tools/list':
        return reply({ tools: MCP_TOOLS });
      case 'tools/call': {
        const name = String(msg.params?.name ?? '');
        const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
        const text = async () => JSON.stringify(await (async () => {
          switch (name) {
            case 'gsc_get_chunk':
              return call(`/api/v1/items/${encodeURIComponent(String(args.id))}`);
            case 'gsc_list_chunks': {
              const qs = new URLSearchParams();
              for (const key of ['type', 'domain', 'q']) {
                if (typeof args[key] === 'string' && args[key]) qs.set(key, String(args[key]));
              }
              return call(`/api/v1/items${qs.size ? `?${qs}` : ''}`);
            }
            case 'gsc_browse_clusters':
              return call('/api/v1/clusters');
            case 'gsc_browse_contexts':
              return call('/api/v1/contexts');
            case 'gsc_get_context':
              return call(`/api/v1/contexts/${encodeURIComponent(String(args.id))}`);
            case 'gsc_get_user_profile':
              return call('/api/v1/profile');
            case 'gsc_propose':
              return call('/api/v1/proposals', { method: 'POST', body: JSON.stringify(args) });
            default:
              throw new Error(`Unknown tool: ${name}`);
          }
        })(), null, 2);
        try {
          return reply({ content: [{ type: 'text', text: await text() }] });
        } catch (e) {
          return reply({ content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : 'tool failed'}` }], isError: true });
        }
      }
      default:
        return msg.id !== undefined
          ? { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } }
          : null;
    }
  };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop() ?? '');
if (isMain) {
  const handler = createMcpHandler();
  const rl = createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    let msg: JsonRpc;
    try {
      msg = JSON.parse(line) as JsonRpc;
    } catch {
      return;
    }
    void handler(msg).then((response) => {
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    });
  });
}
