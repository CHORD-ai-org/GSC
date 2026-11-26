import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { readConfig } from './config.ts';
import { createApiRouter } from './router.ts';
import { createDatabase } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import { MCP_TOOLS } from './mcp/tools.ts';
import { AGENTS_TUTORIAL_MD } from './agents-tutorial.ts';

function fakeReq(method: string, url: string): IncomingMessage {
  const req = Readable.from(['']) as IncomingMessage;
  req.method = method;
  req.url = url;
  return req;
}

describe('FORAGENTS（F1）：agent 自举教程', () => {
  it('GET /api/foragents.md → 200 text/markdown，七节齐全，事实准确', async () => {
    const dir = './.data/pglite-fa';
    const handle = createDatabase();
    await handle.exec(migrationSql());
    const config = readConfig({ PGLITE_DIR: dir });
    const router = createApiRouter(config, handle.db);
    const res = {
      statusCode: 200, body: '', headers: {} as Record<string, string>,
      setHeader(k: string, v: string) { res.headers[k] = v; },
      end(c?: string) { res.body = c ?? ''; },
    };
    await router(fakeReq('GET', '/api/foragents.md') as IncomingMessage, res as unknown as ServerResponse, () => {});
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    for (const probe of ['## 1.', '## 2.', '## 3.', '## 7.', 'gsc_propose', 'GSC_API_TOKEN', 'GSC_API_URL', 'Idempotency-Key', '422']) {
      expect(res.body).toContain(probe);
    }
    expect(res.body).not.toContain('GSC_TOKEN'); // 教程里的 env 名必须与实现一致（GSC_API_TOKEN）
    expect(AGENTS_TUTORIAL_MD.length).toBeGreaterThan(2000);
  });

  it('MCP 工具面=9（教程连通判定的事实锚）', () => {
    expect(MCP_TOOLS.length).toBe(9);
    const names = MCP_TOOLS.map((t) => t.name);
    expect(names).toContain('gsc_propose');
    expect(names).toContain('gsc_search');
  });

  it('教程内容源覆盖九个工具名（防工具增删后教程失真）', () => {
    for (const t of MCP_TOOLS) {
      expect(AGENTS_TUTORIAL_MD).toContain(t.name);
    }
  });

  it('教程 .md 文件事实抽查：env 名/工具名/七节标题齐全，且无实现漂移', () => {
    const md = readFileSync(new URL('../docs/agents/foragents.md', import.meta.url), 'utf-8');
    expect(md).toBe(AGENTS_TUTORIAL_MD); // 导出值=文件原文（单一源）
    expect(md).toContain('GSC_API_TOKEN');
    expect(md).toContain('npm run mcp');
    expect(md.split(/\r?\n/).filter((l) => l.startsWith('## '))).toHaveLength(7);
    for (const t of MCP_TOOLS) expect(md).toContain(t.name);
  });

});
