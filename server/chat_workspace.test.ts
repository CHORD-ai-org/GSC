import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
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
