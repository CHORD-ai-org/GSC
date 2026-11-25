import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readConfig } from './config.ts';
import { createApiRouter } from './router.ts';
import { createDatabase } from './persistence/client.ts';
import type { DatabaseHandle } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import { createConversation, getTaskWithStages, listUiflowsByTask, getUiflow } from './repo/chat.ts';
import { createItem } from './repo/items.ts';
import { createTagDefinition } from './repo/tags.ts';
import { listProposals } from './repo/proposals.ts';

async function fresh(): Promise<{ handle: DatabaseHandle; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'gsc-flow-'));
  const handle = createDatabase();
  await handle.exec(migrationSql());
  return { handle, dir };
}

const config = readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'k' });

function chat(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
}

const PLAN_JSON = '{"title":"整理","goal":"整理 GoatBed 数据","stages":[{"kind":"collect","name":"查找数据"},{"kind":"synthesize","name":"分析融合"},{"kind":"compose","name":"撰写计划"},{"kind":"confirm","name":"Onboarding"}]}';
const FLOW_TEXT = 'flow "关键信息确认"\n  review 项目名 = GoatBed\n  collect 整理粒度\n  confirm write: meta_tag(技术栈), meta_tag(新技术), cluster(智能床垫)';
const SUGGEST_JSON = '{"suggestions":[{"index":0,"semantic_name":"n","classification":"Document","rationale":"r"}]}';

function router(routes: { match: string; reply: string }[]): typeof fetch {
  return (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { messages?: { role: string; content: string }[] };
    const sys = (body.messages ?? []).find((m) => m.role === 'system')?.content ?? '';
    for (const r of routes) if (sys.includes(r.match)) return chat(r.reply);
    return chat('{}');
  }) as typeof fetch;
}

const FAST = { sleep: async () => {}, backoffMs: [0, 0, 0] };
const ROUTES = [
  { match: 'plan an information-organization', reply: PLAN_JSON },
  { match: 'semantic_name', reply: SUGGEST_JSON },
  { match: 'Draft a short plan document', reply: '{"draft":"d"}' },
  { match: 'tiny UI DSL', reply: FLOW_TEXT },
];

describe('G7 FlowPanel 后端（Step 7）：confirm→提案链', () => {
  it('completeFlow：动作→提案映射（定义命中/未命中走 pending_definition）+ uiflow done + 恢复续跑', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat0 = await import('./repo/chat.ts');
      const orch = await import('./agent/orchestrator.ts');
      const conv = await createConversation(handle.db, 'c');
      await createItem(handle.db, { type: 'raw.document', title: 'GoatBed 项目笔记', domain: 'knowledge', origin: 'user', fields: { content_text: '智能床垫数据' } });
      await createTagDefinition(handle.db, { name: '技术栈', group_ids: ['grp_project'] });

      const fetchImpl = router(ROUTES);
      const { task } = await orch.startTask(handle.db, config, conv.id, '整理 GoatBed 数据', { ...FAST, fetchImpl });
      const flows = await listUiflowsByTask(handle.db, task.id);
      expect(flows).toHaveLength(1);
      expect(flows[0].status).toBe('active');

      const r = await orch.completeFlow(handle.db, config, flows[0].id, {
        values: { 项目名: 'GoatBedX', 整理粒度: '周报' },
        choices: {},
      });
      // 动作：meta_tag(技术栈) 命中定义 + meta_tag(新技术) 未命中 + cluster(智能床垫) ×1 ref
      expect(r.proposals).toBe(3);

      const props = await listProposals(handle.db, 'pending');
      const kinds = props.map((p) => p.kind);
      expect(kinds.filter((k) => k === 'meta_tag')).toHaveLength(2);
      expect(kinds.filter((k) => k === 'cluster')).toHaveLength(1);
      expect(kinds.filter((k) => k === 'pending_definition')).toHaveLength(1); // 新技术 → 定义提案
      const newTag = props.find((p) => p.kind === 'meta_tag' && p.related_definition_id?.startsWith('new:'));
      expect(newTag?.related_definition_id).toBe('new:新技术');
      const hitTag = props.find((p) => p.kind === 'meta_tag' && !p.related_definition_id?.startsWith('new:'));
      expect(hitTag?.related_definition_id).toBeTruthy();

      // 回流与续跑：uiflow done · confirm stage done · task done
      const f2 = await getUiflow(handle.db, flows[0].id);
      expect(f2?.status).toBe('done');
      const after = (await chat0.getTaskWithStages(handle.db, task.id))!;
      expect(after.stages.find((s) => s.kind === 'confirm')!.status).toBe('done');
      expect(after.task.status).toBe('done');

      // 幂等：再 complete 零新增
      const again = await orch.completeFlow(handle.db, config, flows[0].id, { values: {}, choices: {} });
      expect(again.proposals).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('路由契约：POST /api/uiflows/:id/complete 通 · 404 未知 uiflow', async () => {
    const { handle, dir } = await fresh();
    try {
      const cfg = readConfig({ PGLITE_DIR: path.join(dir, 'pglite') });
      const apiRouter = createApiRouter(cfg, handle.db);
      const call = async (method: string, url: string, body?: unknown) => {
        const res = {
          statusCode: 200, body: '', setHeader() {}, end(c?: string) { res.body = c ?? ''; },
        };
        const req = Readable.from([body === undefined ? '' : JSON.stringify(body)]) as IncomingMessage;
        req.method = method;
        req.url = url;
        await apiRouter(req, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };
      // 无 LLM → 默认管线 + uispec 模板 flow（confirm write: metadata(plan)）
      const conv = await createConversation(handle.db, 'c');
      const created = await call('POST', `/api/conversations/${conv.id}/messages`, { content: '整理数据' });
      const flow = (await listUiflowsByTask(handle.db, created.json.task.id))[0];
      expect(flow).toBeTruthy();

      const done = await call('POST', `/api/uiflows/${flow.id}/complete`, { values: { 整理粒度: 'x' }, choices: {} });
      expect(done.status).toBe(200);
      expect(done.json.ok).toBe(true);

      expect((await call('POST', '/api/uiflows/uif_none/complete', { values: {}, choices: {} })).status).toBe(404);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
