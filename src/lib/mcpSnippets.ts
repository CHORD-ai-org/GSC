/**
 * U-2: MCP client config snippets (pure). One token, four targets — the
 * Settings › MCP card renders these for copy-paste. Nothing here touches
 * the network or storage; the token value is only ever embedded when the
 * caller just minted it (T301 one-time plaintext precedent).
 */

export type McpClientTarget = 'claude-code' | 'codex' | 'opencode' | 'workbuddy';

export const MCP_CLIENT_TARGETS: readonly McpClientTarget[] = ['claude-code', 'codex', 'opencode', 'workbuddy'];

/** Repo path is machine-local — the UI cannot know it; shown as a fill-in. */
export const GSC_ROOT_PLACEHOLDER = '<GSC_ROOT>';
export const TOKEN_PLACEHOLDER = '<GSC_API_TOKEN>';

export type McpSnippetOptions = {
  /** GSC API base url the MCP server should talk to. */
  url: string;
  /** PAT to embed; pass '' to emit the placeholder instead of a secret. */
  token: string;
  /** Absolute path to the GSC repo; defaults to the placeholder. */
  root?: string;
};

function tokenValue(opts: McpSnippetOptions): string {
  return opts.token || TOKEN_PLACEHOLDER;
}

function rootValue(opts: McpSnippetOptions): string {
  return opts.root || GSC_ROOT_PLACEHOLDER;
}

function envJson(opts: McpSnippetOptions, indent: string): string {
  return [
    `${indent}"GSC_API_URL": ${JSON.stringify(opts.url)}`,
    `${indent}"GSC_API_TOKEN": ${JSON.stringify(tokenValue(opts))}`,
  ].join(',\n');
}

export function mcpSnippet(target: McpClientTarget, opts: McpSnippetOptions): string {
  const script = `${rootValue(opts)}/server/mcp/index.ts`;
  switch (target) {
    case 'claude-code':
    case 'workbuddy':
      return `{
  "mcpServers": {
    "gsc": {
      "command": "node",
      "args": [${JSON.stringify(script)}],
      "env": {
${envJson(opts, '        ')}
      }
    }
  }
}`;
    case 'codex':
      return `[mcp_servers.gsc]
command = "node"
args = [${JSON.stringify(script)}]

[mcp_servers.gsc.env]
GSC_API_URL = ${JSON.stringify(opts.url)}
GSC_API_TOKEN = ${JSON.stringify(tokenValue(opts))}`;
    case 'opencode':
      return `{
  "mcp": {
    "gsc": {
      "type": "local",
      "command": ["node", ${JSON.stringify(script)}],
      "environment": {
${envJson(opts, '        ')}
      }
    }
  }
}`;
  }
}

/** Where the snippet belongs on disk (display hint only). */
export const MCP_SNIPPET_FILE: Record<McpClientTarget, string> = {
  'claude-code': '.mcp.json',
  codex: '~/.codex/config.toml',
  opencode: 'opencode.json (mcp 段)',
  workbuddy: '~/.workbuddy/mcp.json',
};
