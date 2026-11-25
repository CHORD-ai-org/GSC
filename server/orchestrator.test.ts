import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readConfig } from './config.ts';
import { createDatabase } from './persistence/client.ts';
import type { DatabaseHandle } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import { createConversation } from './repo/chat.ts';
import { createItem } from './repo/items.ts';

async function fresh(): Promise<{ handle: DatabaseHandle; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'gsc-orch-'));
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

const PLAN_JSON = '{"title":"智能床垫整理","goal":"整理 GoatBed 项目数据","stages":[{"kind":"collect","name":"查找数据"},{"kind":"synthesize","name":"分析融合"},{"kind":"compose","name":"撰写计划"},{"kind":"confirm","name":"Onboarding","steps":["Information Review"]}]}';
const SUGGEST_JSON = '{"suggestions":[{"index":0,"semantic_name":"GoatBed 项目笔记","classification":"Document","rationale":"r"}]}';
const DRAFT_JSON = '{"draft":"草稿：整理 GoatBed 数据并确认写入。"}';
const FLOW_TEXT = 'flow "关键信息确认"\n  review 项目名 = GoatBed\n  collect 整理粒度\n  confirm write: pending';

/** 路由式 mock：按 system prompt 分派；handlers 可数组（逐次出队）。 */
function router(routes: { match: string; replies: (string | Error)[] }[]): typeof fetch {
  const calls = new Map<string, number>();
  return (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { messages?: { role: string; content: string }[] };
    const sys = (body.messages ?? []).find((m) => m.role === 'system')?.content ?? '';
    for (const r of routes) {
      if (sys.includes(r.match)) {
        const n = calls.get(r.match) ?? 0;
        calls.set(r.match, n + 1);
        const reply = r.replies[Math.min(n, r.replies.length - 1)];
        if (reply instanceof Error) throw reply;
        return chat(reply);
      }
    }
    return chat('{}');
  }) as typeof fetch;
}

const FAST = { sleep: async () => {}, backoffMs: [0, 0, 0] };

describe('G7 薄编排器（Step 3）', () => {
  it('成功链：计划→collect→synthesize 提案→compose 草稿→confirm 停 awaiting_user（uiflow 落）', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat0 = await import('./repo/chat.ts');
      const orch = await import('./agent/orchestrator.ts');
      const conv = await createConversation(handle.db, 'c');
      await createItem(handle.db, { type: 'raw.document', title: 'GoatBed 项目笔记', domain: 'knowledge', origin: 'user', fields: { content_text: '智能床垫数据' } });

      const fetchImpl = router([
        { match: 'plan an information-organization', replies: [PLAN_JSON] },
        { match: 'semantic_name', replies: [SUGGEST_JSON] },
        { match: 'Draft a short plan document', replies: [DRAFT_JSON] },
        { match: 'tiny UI DSL', replies: [FLOW_TEXT] },
      ]);
      const { task, stages, fallback } = await orch.startTask(handle.db, config, conv.id, '把智能床垫项目的数据整理一下', { ...FAST, fetchImpl });
      expect(fallback).toBe(false);
      expect(stages).toHaveLength(4);

      const loaded = (await chat0.getTaskWithStages(handle.db, task.id))!;
      const byKind = Object.fromEntries(loaded.stages.map((s) => [s.kind, s]));
      expect(byKind.collect.status).toBe('done');
      expect(byKind.synthesize.status).toBe('done');
      expect(byKind.compose.status).toBe('done');
      expect(byKind.confirm.status).toBe('awaiting_user'); // 停点
      expect(loaded.task.status).toBe('active');

      const flows = await chat0.listUiflowsByTask(handle.db, task.id);
      expect(flows).toHaveLength(1);
      expect(flows[0].dsl_text).toContain('flow "关键信息确认"');
      expect(flows[0].status).toBe('active');

      // 提案真的落了（synthesize）
      const { listProposals } = await import('./repo/proposals.ts');
      const props = await listProposals(handle.db, 'pending');
      expect(props.some((p) => p.kind === 'semantic_name')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('回退默认管线：计划生成两次违约 → 默认四段 + note 明示', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat0 = await import('./repo/chat.ts');
      const orch = await import('./agent/orchestrator.ts');
      const conv = await createConversation(handle.db, 'c');
      await createItem(handle.db, { type: 'raw.document', title: '数据A', domain: 'knowledge', origin: 'user', fields: { content_text: 'x' } });

      const fetchImpl = router([
        { match: 'plan an information-organization', replies: ['not json at all', '{"bad":1}'] },
        { match: 'semantic_name', replies: [SUGGEST_JSON] },
        { match: 'Draft a short plan document', replies: [DRAFT_JSON] },
        { match: 'tiny UI DSL', replies: [FLOW_TEXT] },
      ]);
      const { fallback, stages } = await orch.startTask(handle.db, config, conv.id, '整理数据A', { ...FAST, fetchImpl });
      expect(fallback).toBe(true);
      expect(stages.map((s) => s.kind)).toEqual(['collect', 'synthesize', 'compose', 'confirm']);

      // note 明示
      const msgs = await chat0.listMessages(handle.db, conv.id);
      const blocks = await chat0.listBlocks(handle.db, msgs.map((m) => m.id));
      expect(blocks.some((b) => b.kind === 'note' && b.content.includes('默认管线'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('重试后成：解析违约 1 次 → stage attempts 留痕 → done；违约 3 连 → failed 红标', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat0 = await import('./repo/chat.ts');
      const orch = await import('./agent/orchestrator.ts');
      const conv = await createConversation(handle.db, 'c');
      await createItem(handle.db, { type: 'raw.document', title: '数据B', domain: 'knowledge', origin: 'user', fields: { content_text: 'y' } });

      // 注：chatComplete 内建重试会吸收 fetch 抛错（瞬时错在 stage 之下自愈）；
      // stage 级重试针对引擎/解析失败——这里用「chat 成功但非数组」触发。
      const fetchImpl = router([
        { match: 'plan an information-organization', replies: [PLAN_JSON] },
        { match: 'semantic_name', replies: ['not an array', SUGGEST_JSON] },
        { match: 'Draft a short plan document', replies: [DRAFT_JSON] },
        { match: 'tiny UI DSL', replies: [FLOW_TEXT] },
      ]);
      const { task } = await orch.startTask(handle.db, config, conv.id, '整理数据B', { ...FAST, fetchImpl });
      const { stages } = (await chat0.getTaskWithStages(handle.db, task.id))!;
      const syn = stages.find((s) => s.kind === 'synthesize')!;
      expect(syn.status).toBe('done');
      expect(syn.attempts).toBeGreaterThanOrEqual(1); // 重试留痕

      // 红标：三连解析违约 → failed
      const conv2 = await createConversation(handle.db, 'c2');
      const fetch2 = router([
        { match: 'plan an information-organization', replies: [PLAN_JSON] },
        { match: 'semantic_name', replies: ['bad-1', 'bad-2', 'bad-3'] },
        { match: 'Draft a short plan document', replies: [DRAFT_JSON] },
        { match: 'tiny UI DSL', replies: [FLOW_TEXT] },
      ]);
      const { task: t2 } = await orch.startTask(handle.db, config, conv2.id, '整理数据B', { ...FAST, fetchImpl: fetch2 });
      const { stages: st2 } = (await chat0.getTaskWithStages(handle.db, t2.id))!;
      const syn2 = st2.find((s) => s.kind === 'synthesize')!;
      expect(syn2.status).toBe('failed'); // 红标
      expect(syn2.attempts).toBeGreaterThanOrEqual(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('恢复续跑：resumeTask 喂输入 → confirm done → 任务完成', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat0 = await import('./repo/chat.ts');
      const orch = await import('./agent/orchestrator.ts');
      const conv = await createConversation(handle.db, 'c');
      await createItem(handle.db, { type: 'raw.document', title: '数据C', domain: 'knowledge', origin: 'user', fields: { content_text: 'z' } });

      const fetchImpl = router([
        { match: 'plan an information-organization', replies: [PLAN_JSON] },
        { match: 'semantic_name', replies: [SUGGEST_JSON] },
        { match: 'Draft a short plan document', replies: [DRAFT_JSON] },
        { match: 'tiny UI DSL', replies: [FLOW_TEXT] },
      ]);
      const { task } = await orch.startTask(handle.db, config, conv.id, '整理数据C', { ...FAST, fetchImpl });
      const { stages } = (await chat0.getTaskWithStages(handle.db, task.id))!;
      const confirm = stages.find((s) => s.kind === 'confirm')!;
      expect(confirm.status).toBe('awaiting_user');

      await orch.resumeTask(handle.db, config, task.id, confirm.id, '粒度=周报，排除会议纪要', { ...FAST, fetchImpl });
      const after = (await chat0.getTaskWithStages(handle.db, task.id))!;
      expect(after.stages.find((s) => s.kind === 'confirm')!.status).toBe('done');
      expect(after.task.status).toBe('done');

      const msgs = await chat0.listMessages(handle.db, conv.id);
      const blocks = await chat0.listBlocks(handle.db, msgs.map((m) => m.id));
      expect(blocks.some((b) => b.kind === 'note' && b.content.includes('任务完成'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
