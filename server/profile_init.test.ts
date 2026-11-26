import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDatabase } from './persistence/client.ts';
import type { DatabaseHandle } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import { createUser } from './repo/users.ts';
import { createItem } from './repo/items.ts';
import { createTagDefinition, listMetaGroups } from './repo/tags.ts';
import { listProposals } from './repo/proposals.ts';
import { buildInitialProfile, ensureProfileAnchor, DEFAULT_COMPANION } from './agent/profile-init.ts';

async function fresh(): Promise<{ handle: DatabaseHandle; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'gsc-pinit-'));
  const handle = createDatabase();
  await handle.exec(migrationSql());
  return { handle, dir };
}

const config = (() => {
  const { readConfig } = require('./config.ts') as typeof import('./config.ts');
  return readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'k' });
})();

function chat(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
}

describe('USER_PROFILE_INIT（U1）：初始画像构建管线', () => {
  it('锚点幂等 + 伴灵名默认 Tau + 持久化', async () => {
    const { handle, dir } = await fresh();
    try {
      const user = await createUser(handle.db, 'Ceaser');
      const a1 = await ensureProfileAnchor(handle.db, user.name);
      const a2 = await ensureProfileAnchor(handle.db, user.name);
      expect(a1).toBe(a2); // 幂等
      const all = await (await import('./repo/items.ts')).listItems(handle.db);
      expect(all.find((i) => i.id === a1)?.source_label).toBe('user_profile');
      await buildInitialProfile(handle.db, undefined, { userId: user.id, userName: user.name });
      const { getCompanionName } = await import('./repo/users.ts');
      expect(await getCompanionName(handle.db, user.id)).toBe(DEFAULT_COMPANION);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('打标提案：限定用户画像组、挂到来源 chunk；401 时锚点仍建+降级记账', async () => {
    const { handle, dir } = await fresh();
    try {
      const { run } = { run: true };
      void run;
      const user = await createUser(handle.db, 'Ceaser');
      await createItem(handle.db, {
        type: 'raw.document', title: '我的技术偏好', domain: 'user', origin: 'user',
        fields: { content_text: '偏好轻量工具链，常用 TypeScript 与终端工作流' },
      });
      const groups = await listMetaGroups(handle.db);
      const g = groups.find((x) => x.key === '用户画像');
      if (g) await createTagDefinition(handle.db, { name: '工具链偏好', group_ids: [g.id] });

      // 401 降级：锚点+伴灵名照建，提案为 0，llm=skipped
      const failFetch = (async () => { throw new Error('LLM HTTP 401'); }) as unknown as typeof fetch;
      const r1 = await buildInitialProfile(handle.db, config, { userId: user.id, userName: user.name, fetchImpl: failFetch });
      expect(r1.anchor_id).toBeTruthy();
      expect(r1.llm).toBe('skipped');
      expect(r1.proposals).toBe(0);
      expect(await (await import('./repo/users.ts')).getCompanionName(handle.db, user.id)).toBe('Tau');

      // 正常 LLM：建议命中 → meta_tag 提案（target=来源 chunk）
      const items = await (await import('./repo/items.ts')).listItems(handle.db);
      const src = items.find((i) => i.id !== r1.anchor_id)!;
      const defId = (await (await import('./repo/tags.ts')).listTagDefinitions(handle.db)).find((d) => d.name === '工具链偏好')!.id;
      const okFetch = (async (_u: unknown, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { messages?: { role: string; content: string }[] };
        const sys = (body.messages ?? []).find((m) => m.role === 'system')?.content ?? '';
        if (sys.includes('Assign meta tags')) {
          return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ tags: [{ item: src.id, definition: defId, value: 'TypeScript + 终端流', why: '偏好明确' }], new_tags: [] }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        return new Response(JSON.stringify({ choices: [{ message: { content: '{"names":[]}' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
      }) as unknown as typeof fetch;
      const r2 = await buildInitialProfile(handle.db, config, { userId: user.id, userName: user.name, fetchImpl: okFetch });
      expect(r2.llm).toBe('ok');
      expect(r2.proposals).toBeGreaterThanOrEqual(1);
      const props = await listProposals(handle.db, 'pending');
      const mt = props.find((p) => p.kind === 'meta_tag');
      expect(mt?.target_id).toBe(src.id);
      expect(mt?.rationale).toContain('profile-init');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('router：POST /api/profile/init → 201 + 报告', async () => {
    const { handle, dir } = await fresh();
    try {
      const { createApiRouter } = await import('./router.ts');
      const cfg = (await import('./config.ts')).readConfig({ PGLITE_DIR: path.join(dir, 'p') });
      const apiRouter = (await import('./router.ts')).createApiRouter(cfg, handle.db);
      const res = {
        statusCode: 200, body: '', headers: {} as Record<string, string>,
        setHeader() {}, end(c?: string) { res.body = c ?? ''; },
      };
      const req = Readable.from([JSON.stringify({})]) as unknown as IncomingMessage;
      req.method = 'POST';
      req.url = '/api/profile/init';
      await apiRouter(req as IncomingMessage, res as unknown as import('node:http').ServerResponse, () => {});
      expect(res.statusCode).toBe(201);
      const d = JSON.parse(res.body);
      expect(d.ok).toBe(true);
      expect(d.companion).toBe('Tau');
      expect(d.anchor_id).toBeTruthy();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
