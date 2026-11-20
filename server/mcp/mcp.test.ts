import { describe, expect, it } from 'vitest';
import { MCP_TOOLS, createMcpHandler } from './index.ts';

function stubFetch(routes: Record<string, unknown>) {
  return async (url: string) => {
    const key = url.replace('http://test', '');
    if (key in routes) {
      return new Response(JSON.stringify(routes[key]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: false, kind: 'not_found', message: 'no route', retryable: false }), { status: 404 });
  };
}

describe('gsc mcp server', () => {
  it('completes the handshake and lists tools', async () => {
    const handle = createMcpHandler(stubFetch({}), 'http://test', 'tok');
    const init = (await handle({ jsonrpc: '2.0', id: 1, method: 'initialize' })) as { result: { serverInfo: { name: string } } };
    expect(init.result.serverInfo.name).toBe('gsc-mcp');
    const list = (await handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' })) as { result: { tools: unknown[] } };
    expect(list.result.tools).toHaveLength(MCP_TOOLS.length);
    expect(MCP_TOOLS.map((t) => t.name)).toContain('gsc_get_chunk');
    expect(MCP_TOOLS.map((t) => t.name)).toContain('gsc_propose');
  });

  it('routes tool calls to the HTTP API and returns JSON text', async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({ ok: true, items: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const handle = createMcpHandler(fetchImpl, 'http://test', 'tok');
    const res = (await handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'gsc_list_chunks', arguments: { type: 'raw.document', q: 'chunking' } },
    })) as { result: { content: { text: string }[] } };
    expect(calls[0]).toContain('http://test/api/v1/items?type=raw.document&q=chunking');
    expect(JSON.parse(res.result.content[0].text)).toEqual({ ok: true, items: [] });
  });

  it('reports unknown tools as tool errors and unknown methods as JSON-RPC errors', async () => {
    const handle = createMcpHandler(stubFetch({}), 'http://test', '');
    const bad = (await handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope', arguments: {} } })) as { result: { isError: boolean } };
    expect(bad.result.isError).toBe(true);
    const missing = (await handle({ jsonrpc: '2.0', id: 5, method: 'bogus' })) as { error: { code: number } };
    expect(missing.error.code).toBe(-32601);
    expect(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
  });
});
