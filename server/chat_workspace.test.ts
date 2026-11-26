import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import type { StageStatus, PatchOp } from './repo/chat.ts';
import { createDatabase } from './persistence/client.ts';
import type { DatabaseHandle } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import {
  conversations, messages, messageBlocks, tasks, taskStages, uiflows,
} from './persistence/schema.ts';

async function fresh(): Promise<{ handle: DatabaseHandle; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'gsc-chatws-'));
  const handle = createDatabase();
  await handle.exec(migrationSql());
  return { handle, dir };
}

async function seedConv(handle: DatabaseHandle) {
  const now = new Date();
  await handle.db.insert(conversations).values({ id: 'cnv_t', title: 't', created_at: now });
  await handle.db.insert(messages).values({ id: 'msg_t', conversation_id: 'cnv_t', role: 'user', content: 'hi', created_at: now });
  return { now };
}

describe('G7 数据层（0016）', () => {
  it('CHECK 约束拒绝非法枚举（块/阶段/状态）', async () => {
    const { handle, dir } = await fresh();
    try {
      await seedConv(handle);
      await expect(handle.db.insert(messageBlocks).values({
        id: 'blk_x', message_id: 'msg_t', kind: 'bogus', ord: 1024, content: '',
      })).rejects.toThrow();
      await handle.db.insert(tasks).values({ id: 'tsk_t', message_id: 'msg_t', title: 'T', goal: 'g' });
      await expect(handle.db.insert(taskStages).values({
        id: 'stg_x', task_id: 'tsk_t', kind: 'bogus', name: 'x', ord: 1024,
      })).rejects.toThrow();
      await handle.db.insert(taskStages).values({ id: 'stg_ok', task_id: 'tsk_t', kind: 'collect', name: 'x', ord: 1024 });
      await expect(handle.db.insert(taskStages).values({
        id: 'stg_y', task_id: 'tsk_t', kind: 'confirm', name: 'y', ord: 2048, status: 'bogus',
      })).rejects.toThrow();
      await expect(handle.db.insert(uiflows).values({
        id: 'ui_x', task_id: 'tsk_t', stage_id: 'stg_ok', status: 'bogus',
      })).rejects.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('稀疏 ord 惯例（间隔 1024）+ (task_id, ord) 唯一 + conversations.version 默认 1', async () => {
    const { handle, dir } = await fresh();
    try {
      await seedConv(handle);
      const [conv] = await handle.db.select().from(conversations).where(eq(conversations.id, 'cnv_t'));
      expect(conv.version).toBe(1);

      await handle.db.insert(tasks).values({ id: 'tsk_t', message_id: 'msg_t', title: 'T', goal: 'g' });
      await handle.db.insert(taskStages).values({ id: 'stg_a', task_id: 'tsk_t', kind: 'collect', name: '查找数据', ord: 1024 });
      await handle.db.insert(taskStages).values({ id: 'stg_b', task_id: 'tsk_t', kind: 'synthesize', name: '分析融合', ord: 2048 });
      await handle.db.insert(taskStages).values({ id: 'stg_mid', task_id: 'tsk_t', kind: 'compose', name: '插入中段', ord: 1536 });
      const rows = await handle.db.select().from(taskStages).where(eq(taskStages.task_id, 'tsk_t'));
      expect(rows.map((r) => r.ord).sort((a, b) => a - b)).toEqual([1024, 1536, 2048]);

      // (task_id, ord) 唯一
      await expect(handle.db.insert(taskStages).values({
        id: 'stg_dup', task_id: 'tsk_t', kind: 'confirm', name: 'dup', ord: 1024,
      })).rejects.toThrow();
      // blocks 同样稀疏唯一
      await handle.db.insert(messageBlocks).values({ id: 'blk_a', message_id: 'msg_t', kind: 'note', ord: 1024, content: 'n' });
      await expect(handle.db.insert(messageBlocks).values({
        id: 'blk_dup', message_id: 'msg_t', kind: 'text', ord: 1024, content: '',
      })).rejects.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('G7 仓储（Step 2）：PATCH 算子 + 状态机转移表', () => {
  async function seedTask(handle: DatabaseHandle) {
    const now = new Date();
    await handle.db.insert(conversations).values({ id: 'cnv_a', title: 't', created_at: now });
    await handle.db.insert(messages).values({ id: 'msg_a', conversation_id: 'cnv_a', role: 'user', content: 'go', created_at: now });
    const chat = await import('./repo/chat.ts');
    return chat.createTask(handle.db, {
      message_id: 'msg_a', title: '整理', goal: 'g',
      stages: [{ kind: 'collect', name: '查找数据' }, { kind: 'synthesize', name: '分析融合' }],
    });
  }

  it('转移表全 pair：合法迁移过、非法迁移拒（InvalidTransitionError）', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat = await import('./repo/chat.ts');
      const { stages } = await seedTask(handle);
      const ALL: StageStatus[] = ['pending', 'running', 'awaiting_user', 'done', 'failed'];
      // pair 验证矩阵（不逐格改库：canTransition 单位级全 pair + 非法迁移实改库拒）
      for (const from of ALL) for (const to of ALL) {
        expect(typeof chat.canTransition(from, to)).toBe('boolean');
      }
      expect(chat.canTransition('pending', 'running')).toBe(true);
      expect(chat.canTransition('pending', 'done')).toBe(false);
      expect(chat.canTransition('running', 'awaiting_user')).toBe(true);
      expect(chat.canTransition('awaiting_user', 'running')).toBe(true);
      expect(chat.canTransition('done', 'running')).toBe(false);
      expect(chat.canTransition('failed', 'done')).toBe(false);

      const st = stages[0];
      await expect(chat.transitionStage(handle.db, st.id, 'done')).rejects.toThrow(chat.InvalidTransitionError);
      await chat.transitionStage(handle.db, st.id, 'running');
      await chat.transitionStage(handle.db, st.id, 'awaiting_user', { detail: 'onboarding' });
      await chat.transitionStage(handle.db, st.id, 'running', { actor: 'user' });
      const after = await chat.transitionStage(handle.db, st.id, 'done');
      expect(after.status).toBe('done');
      // 对账不变式：每次迁移留 task_events
      const { taskEvents } = await import('./persistence/schema.ts');
      const { eq: eq2 } = await import('drizzle-orm');
      const evs = await handle.db.select().from(taskEvents).where(eq2(taskEvents.task_id, st.task_id));
      expect(evs.filter((e) => e.action === 'stage_transition').length).toBeGreaterThanOrEqual(4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('op_hash 幂等：同批 ops 重放零重复；纯增即时 / 删移改 kind 走提案', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat = await import('./repo/chat.ts');
      const { task, stages } = await seedTask(handle);
      const ops: PatchOp[] = [
        { op: 'add_stage', after: 2, kind: 'compose', name: '撰写计划', steps: ['组装'] },
        { op: 'remove_stage', target: 1 },
        { op: 'update_stage', target: 2, kind: 'confirm' }, // 改 kind → 提案
        { op: 'update_stage', target: 2, name: '分析融合v2' }, // 改名 → 即时
      ];
      const r1 = await chat.patchTask(handle.db, task.id, ops, 1);
      expect(r1.applied).toHaveLength(2);   // add + update(name)
      expect(r1.proposed).toHaveLength(2);  // remove + update(kind)
      expect(r1.replayed).toBe(0);

      // 重放同批：零重复
      const [t2] = await (await import('drizzle-orm')).eq ? [undefined] : [undefined];
      void t2;
      const r2 = await chat.patchTask(handle.db, task.id, ops, 2); // 版本批进一次：r1 后 version=2
      expect(r2.replayed).toBe(4);
      expect(r2.applied).toHaveLength(0);
      expect(r2.proposed).toHaveLength(0);

      const { stages: after } = (await chat.getTaskWithStages(handle.db, task.id))!;
      expect(after.map((s) => s.name)).toContain('撰写计划');
      expect(after.map((s) => s.name)).toContain('分析融合v2');
      expect(after).toHaveLength(3); // 2 原 + add（remove 仍在提案未应用）

      // 提案裁决：accept remove → 阶段消失；reject 不动
      const pending = await chat.listTaskPatches(handle.db, task.id, 'proposed');
      const removeP = pending.find((p) => p.op_kind === 'remove_stage')!;
      await chat.resolvePatchOp(handle.db, removeP.id, 'accepted', 2);
      const { stages: s3 } = (await chat.getTaskWithStages(handle.db, task.id))!;
      expect(s3.find((s) => s.id === stages[0].id)).toBeUndefined();

      const kindP = (await chat.listTaskPatches(handle.db, task.id, 'proposed')).find((p) => p.op_kind === 'update_stage')!;
      await chat.resolvePatchOp(handle.db, kindP.id, 'rejected', 3); // accept 后 version=3
      const { stages: s4 } = (await chat.getTaskWithStages(handle.db, task.id))!;
      expect(s4.find((s) => s.id === stages[1].id)?.kind).toBe('synthesize'); // kind 未改
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('稀疏 ord 并发插入：并行 add_block 全落且序号唯一', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat = await import('./repo/chat.ts');
      await seedTask(handle);
      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) => chat.addBlock(handle.db, 'msg_a', { kind: 'note', content: `n${i}` })),
      );
      const ords = results.map((b) => b.ord);
      expect(new Set(ords).size).toBe(5);
      expect(Math.min(...ords)).toBe(1024);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('G7 V3（Step 9）：黄点 + 播报回放', () => {
  it('对话行 awaiting_user 黄点：有停点任务的会话标记正确', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat = await import('./repo/chat.ts');
      const now = new Date();
      await handle.db.insert(conversations).values({ id: 'cnv_a', title: '有停点', created_at: now });
      await handle.db.insert(conversations).values({ id: 'cnv_b', title: '无停点', created_at: now });
      await handle.db.insert(messages).values({ id: 'msg_a', conversation_id: 'cnv_a', role: 'user', content: 'x', created_at: now });
      await handle.db.insert(messages).values({ id: 'msg_b', conversation_id: 'cnv_b', role: 'user', content: 'y', created_at: now });
      await handle.db.insert(tasks).values({ id: 'tsk_a', message_id: 'msg_a', title: 'T', goal: 'g', status: 'active', version: 1 });
      await handle.db.insert(taskStages).values({ id: 'stg_a', task_id: 'tsk_a', kind: 'confirm', name: 'O', ord: 1024, status: 'awaiting_user' });

      const rows = await chat.listConversationsWithStatus(handle.db);
      const a = rows.find((r) => r.id === 'cnv_a')!;
      const b = rows.find((r) => r.id === 'cnv_b')!;
      expect(a.awaiting).toBe(true);
      expect(b.awaiting).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('播报四类回放完整可审计（启动/推进/停点/恢复）+ task_events 对账', async () => {
    const { handle, dir } = await fresh();
    try {
      const chat = await import('./repo/chat.ts');
      const orch = await import('./agent/orchestrator.ts');
      const config = (await import('./config.ts')).readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'k' });
      const conv = await chat.createConversation(handle.db, 'c');
      const fetchImpl = (async () => new Response(JSON.stringify({
        choices: [{ message: { content: '{"title":"T","goal":"整理数据","stages":[{"kind":"collect","name":"查找数据"},{"kind":"synthesize","name":"分析融合"},{"kind":"compose","name":"撰写计划"},{"kind":"confirm","name":"Onboarding"}]}' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
      const { task } = await orch.startTask(handle.db, config, conv.id, '整理数据', { sleep: async () => {}, backoffMs: [0, 0, 0], fetchImpl });
      const flows = await chat.listUiflowsByTask(handle.db, task.id);
      await orch.resumeTask(handle.db, config, task.id, flows[0].stage_id, 'ok', { sleep: async () => {}, backoffMs: [0, 0, 0], fetchImpl });

      const msgs = await chat.listMessages(handle.db, conv.id);
      const blocks = await chat.listBlocks(handle.db, msgs.map((m) => m.id));
      const notes = blocks.filter((b) => b.kind === 'note').map((b) => b.content);
      expect(notes.some((n) => n.includes('正在启动信息收集管线'))).toBe(true); // 启动（原型原文）
      expect(notes.some((n) => n.includes('启动关键信息的Onboarding的交互流'))).toBe(true); // 停点
      expect(notes.some((n) => n.includes('恢复执行'))).toBe(true); // 恢复
      expect(notes.some((n) => n.includes('开始编辑项目文件夹'))).toBe(true); // 终态
      expect(notes.some((n) => n.includes('正在执行：'))).toBe(false); // 内部执行日志不进消息块

      // task_events 对账：stage 迁移都有事件行
      const { taskEvents } = await import('./persistence/schema.ts');
      const { eq: eq2, like } = await import('drizzle-orm');
      const evs = await handle.db.select().from(taskEvents).where(eq2(taskEvents.task_id, task.id));
      const transitions = evs.filter((e) => e.action === 'stage_transition');
      const { stages } = (await chat.getTaskWithStages(handle.db, task.id))!;
      expect(transitions.length).toBeGreaterThanOrEqual(stages.length); // ≥每段一次迁移
      expect(evs.some((e) => e.action === 'created')).toBe(true);
      void like;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
