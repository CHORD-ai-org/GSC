import { describe, expect, it } from 'vitest';
import {
  MCP_CLIENT_TARGETS,
  MCP_SNIPPET_FILE,
  TOKEN_PLACEHOLDER,
  mcpSnippet,
  type McpClientTarget,
} from './mcpSnippets.ts';

describe('U-2 MCP client snippets', () => {
  it('emits a well-formed snippet for every target with the placeholder token', () => {
    for (const target of MCP_CLIENT_TARGETS) {
      const out = mcpSnippet(target, { url: 'http://127.0.0.1:8788', token: '' });
      expect(out, target).toContain('server/mcp/index.ts');
      expect(out, target).toContain('http://127.0.0.1:8788');
      expect(out, target).toContain(TOKEN_PLACEHOLDER);
      expect(MCP_SNIPPET_FILE[target], target).toBeTruthy();
    }
  });

  it('embeds the real token only when provided (T301 one-time plaintext)', () => {
    const out = mcpSnippet('codex', { url: 'http://127.0.0.1:8788', token: 'token_abc123' });
    expect(out).toContain('token_abc123');
    expect(out).not.toContain(TOKEN_PLACEHOLDER);
  });

  it('honours a concrete repo root over the placeholder', () => {
    const out = mcpSnippet('claude-code', { url: 'http://127.0.0.1:8788', token: '', root: 'D:/gsc' });
    expect(out).toContain('D:/gsc/server/mcp/index.ts');
    expect(out).not.toContain('<GSC_ROOT>');
  });

  it('JSON targets parse as valid JSON', () => {
    for (const target of ['claude-code', 'workbuddy', 'opencode'] as McpClientTarget[]) {
      const out = mcpSnippet(target, { url: 'http://127.0.0.1:8788', token: '' });
      expect(() => JSON.parse(out), target).not.toThrow();
    }
  });

  it('codex emits TOML sections (not JSON)', () => {
    const out = mcpSnippet('codex', { url: 'http://127.0.0.1:8788', token: '' });
    expect(out).toContain('[mcp_servers.gsc]');
    expect(out).toContain('[mcp_servers.gsc.env]');
    expect(() => JSON.parse(out)).toThrow();
  });
});
