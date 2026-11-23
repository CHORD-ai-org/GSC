/**
 * GSC MCP server (D-059): minimal stdio JSON-RPC 2.0 surface —
 * initialize / tools/list / tools/call — backed by the GSC HTTP API
 * (never opens PGlite directly; one domain contract, see API_CONTRACT.md).
 * Run: GSC_API_TOKEN=... npm run mcp
 *
 * INTEGRATION_HARDENING (P0-C) — commercial DX/observability baseline:
 * - every tool carries MCP `annotations` (readOnly/idempotent/destructive) so an
 *   agent can schedule safely without guessing;
 * - list tools accept `limit`/`cursor` passthrough (no unbounded payloads);
 * - `gsc_search` and `gsc_get_cluster` round out the read surface;
 * - tool failures return a structured `{ error: { code, message } }` (not a bare
 *   string) and every call is timed + logged to stderr.
 *
 * NOTE: stdout is reserved for JSON-RPC. All logging goes to stderr so the
 * protocol stream stays clean.
 */
import { createInterface } from 'node:readline';

const BASE = (process.env.GSC_API_URL ?? 'http://127.0.0.1:8788').replace(/\/$/, '');
const TOKEN = process.env.GSC_API_TOKEN ?? '';

type JsonRpc = { jsonrpc: '2.0'; id?: number | string | null; method?: string; params?: Record<string, unknown> };

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/* M-1: the tool registry lives in tools.ts — shared with the HTTP API's
   GET /api/meta/mcp so the Settings UI can never drift from tools/list. */
import { MCP_SERVER_INFO, MCP_TOOLS, type McpAnnotations, type McpTool } from './tools.ts';
export { MCP_SERVER_INFO, MCP_TOOLS, type McpAnnotations, type McpTool };

/** Tool failure carrying an API error `kind` as its machine-readable code. */
export class McpToolError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'McpToolError';
    this.code = code;
  }
}

/** stderr-only logger: stdout is reserved for the JSON-RPC stream. */
function mcpLog(level: 'info' | 'warn' | 'error', msg: string, fields: Record<string, unknown>): void {
  process.stderr.write(`${JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields })}\n`);
}

function paging(args: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  if (typeof args.limit === 'number' && args.limit > 0) qs.set('limit', String(Math.min(200, Math.floor(args.limit))));
  if (typeof args.cursor === 'string' && args.cursor) qs.set('cursor', args.cursor);
  return qs.size ? `&${qs}` : '';
}

/* MCP prompts (read-only workflows over GSC data) and resources (stable URIs). */
const MCP_PROMPTS: {
  name: string;
  description: string;
  arguments?: { name: string; required: boolean }[];
  messages: { role: 'user' | 'assistant'; template: string }[];
}[] = [
  {
    name: 'summarize_item',
    description: 'Summarize one GSC item with its provenance and relations',
    arguments: [{ name: 'id', required: true }],
    messages: [{
      role: 'user',
      template: 'Fetch GSC item {id} (tool gsc_get_chunk) and summarize: what it is, where it came from (origin/source_label), and how it relates to other information. Keep the summary faithful to the stored content.',
    }],
  },
  {
    name: 'review_proposals',
    description: 'Review pending machine proposals and recommend accept/reject',
    messages: [{
      role: 'user',
      template: 'List pending proposals in GSC (GET /api/v1/proposals via gsc tools) and for each recommend accept/reject with one sentence of reasoning. Machine proposals are unconfirmed until a human accepts them — do not present them as facts.',
    }],
  },
];

const MCP_RESOURCES: { uri: string; name: string; mimeType: string; path: string }[] = [
  { uri: 'gsc://profile', name: 'User profile (confirmed tag values)', mimeType: 'application/json', path: '/api/v1/profile' },
  { uri: 'gsc://proposals/pending', name: 'Pending machine proposals', mimeType: 'application/json', path: '/api/v1/proposals' },
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
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || body.ok === false) {
        const code = typeof body.kind === 'string' ? body.kind : `http_${res.status}`;
        throw new McpToolError(code, typeof body.message === 'string' ? body.message : `HTTP ${res.status}`);
      }
      return body;
    };

    switch (msg.method) {
      case 'initialize':
        return reply({
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, prompts: {}, resources: {} },
          serverInfo: MCP_SERVER_INFO,
        });
      case 'notifications/initialized':
        return null;
      case 'tools/list':
        return reply({ tools: MCP_TOOLS });
      case 'prompts/list':
        return reply({ prompts: MCP_PROMPTS });
      case 'prompts/get': {
        const name = String(msg.params?.name ?? '');
        const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
        const prompt = MCP_PROMPTS.find((p) => p.name === name);
        if (!prompt) {
          return { jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32602, message: `Unknown prompt: ${name}` } };
        }
        return reply({
          description: prompt.description,
          messages: prompt.messages.map((m) => ({
            role: m.role,
            content: { type: 'text', text: m.template.replace(/\{(\w+)\}/g, (_, k: string) => String(args[k] ?? `{${k}}`)) },
          })),
        });
      }
      case 'resources/list':
        return reply({ resources: MCP_RESOURCES });
      case 'resources/read': {
        const uri = String(msg.params?.uri ?? '');
        const target = MCP_RESOURCES.find((r) => r.uri === uri);
        if (!target) {
          return { jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32602, message: `Unknown resource: ${uri}` } };
        }
        const body = await call(target.path);
        return reply({ contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(body, null, 2) }] });
      }
      case 'tools/call': {
        const name = String(msg.params?.name ?? '');
        const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
        const startedAt = Date.now();
        const run = async () => {
          switch (name) {
            case 'gsc_get_chunk':
              return call(`/api/v1/items/${encodeURIComponent(String(args.id))}`);
            case 'gsc_list_chunks': {
              const qs = new URLSearchParams();
              for (const key of ['type', 'domain', 'q']) {
                if (typeof args[key] === 'string' && args[key]) qs.set(key, String(args[key]));
              }
              const page = paging(args);
              return call(`/api/v1/items${qs.size ? `?${qs}` : ''}${qs.size ? page : page.replace(/^&/, '?')}`);
            }
            case 'gsc_search':
              return call(`/api/v1/search?q=${encodeURIComponent(String(args.q ?? ''))}`);
            case 'gsc_browse_clusters': {
              const page = paging(args);
              return call(`/api/v1/clusters${page.replace(/^&/, '?')}`);
            }
            case 'gsc_get_cluster':
              return call(`/api/v1/clusters/${encodeURIComponent(String(args.id))}`);
            case 'gsc_browse_contexts': {
              const page = paging(args);
              return call(`/api/v1/contexts${page.replace(/^&/, '?')}`);
            }
            case 'gsc_get_context':
              return call(`/api/v1/contexts/${encodeURIComponent(String(args.id))}`);
            case 'gsc_get_user_profile':
              return call('/api/v1/profile');
            case 'gsc_propose':
              return call('/api/v1/proposals', { method: 'POST', body: JSON.stringify(args) });
            default:
              throw new McpToolError('unknown_tool', `Unknown tool: ${name}`);
          }
        };
        try {
          const result = await run();
          mcpLog('info', 'mcp.tool', { tool: name, ms: Date.now() - startedAt, ok: true });
          return reply({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
        } catch (e) {
          const code = e instanceof McpToolError ? e.code : 'internal';
          const message = e instanceof Error ? e.message : 'tool failed';
          mcpLog('warn', 'mcp.tool', { tool: name, ms: Date.now() - startedAt, ok: false, code });
          return reply({
            content: [{ type: 'text', text: JSON.stringify({ error: { code, message } }) }],
            isError: true,
          });
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
  mcpLog('info', 'mcp.start', { base: BASE, authed: Boolean(TOKEN) });
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
