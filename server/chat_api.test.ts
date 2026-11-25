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
import { createConversation } from './repo/chat.ts';

function fakeRes() {
  const res = {
    statusCode: 200, body: '',
    setHeader() {},
    end(chunk?: string) { res.body = chunk ?? ''; },
  };
  return res;
}

function fakeReq(method: string, url: string, body?: unknown): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  const req = Readable.from([payload]) as IncomingMessage;
  req.method = method;
  req.url = url;
  return req;
}

describe('G7 API（Step 4）', () => {
  it('POST messages→201 骨架（回退默认管线）· GET messages 带块 · GET task 投影源', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-api-'));
    try {
      const handle: DatabaseHandle = createDatabase();
      await handle.exec(migrationSql());
      // LLM 未配置 → 计划回退默认管线（catch-all，不阻塞）
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite') });
      const router = createApiRouter(config, handle.db);
      const call = async (method: string, url: string, body?: unknown) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };
      const conv = await createConversation(handle.db, 'c1');

      const created = await call('POST', `/api/conversations/${conv.id}/messages`, { content: '整理数据B' });
      expect(created.status).toBe(201);
      expect(created.json.fallback).toBe(true);
      expect(created.json.stages.map((s: { kind: string }) => s.kind))
        .toEqual(['collect', 'synthesize', 'compose', 'confirm']);

      const msgs = await call('GET', `/api/conversations/${conv.id}/messages`);
      expect(msgs.status).toBe(200);
      expect(msgs.json.messages.length).toBeGreaterThanOrEqual(2); // user + run
      const allBlocks = msgs.json.messages.flatMap((m: { blocks: unknown[] }) => m.blocks);
      expect(allBlocks.some((b: { kind: string; content: string }) => b.kind === 'operation')).toBe(true); // 任务卡
      expect(allBlocks.some((b: { kind: string; content: string }) => b.kind === 'note' && b.content.includes('默认管线'))).toBe(true);

      const taskId = created.json.task.id;
      const t = await call('GET', `/api/tasks/${taskId}`);
      expect(t.status).toBe(200);
      expect(t.json.task.id).toBe(taskId);
      expect(t.json.stages.length).toBe(4);
      expect(Array.isArray(t.json.uiflows)).toBe(true);
      expect(Array.isArray(t.json.patches)).toBe(true);

      // 契约：空 content 拒
      expect((await call('POST', `/api/conversations/${conv.id}/messages`, { content: '' })).status).toBe(400);
      expect((await call('POST', '/api/conversations/cnv_none/messages', { content: 'x' })).status).toBe(404);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('PATCH 乐观锁 409 · 算子契约 400 · advance 422（完成段不可推进）', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-api2-'));
    try {
      const handle: DatabaseHandle = createDatabase();
      await handle.exec(migrationSql());
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite') });
      const router = createApiRouter(config, handle.db);
      const call = async (method: string, url: string, body?: unknown) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };
      const conv = await createConversation(handle.db, 'c1');
      const created = await call('POST', `/api/conversations/${conv.id}/messages`, { content: '整理数据C' });
      const taskId = created.json.task.id;
      const version = created.json.task.version;

      // 409：版本失配
      const p409 = await call('PATCH', `/api/tasks/${taskId}`, {
        version: version + 99,
        ops: [{ op: 'add_stage', kind: 'compose', name: '导出PDF' }],
      });
      expect(p409.status).toBe(409);

      // 400：非法算子
      const p400 = await call('PATCH', `/api/tasks/${taskId}`, {
        version, ops: [{ op: 'bogus_op' }],
      });
      expect(p400.status).toBe(400);

      // PATCH 纯增即时：合法批过 → applied
      const ok1 = await call('PATCH', `/api/tasks/${taskId}`, {
        version, ops: [{ op: 'add_stage', after: 4, kind: 'compose', name: '导出PDF' }],
      });
      expect(ok1.status).toBe(200);
      expect(ok1.json.applied).toHaveLength(1);
      expect(ok1.json.proposed).toHaveLength(0);

      // 422：advance 已 done 段
      const t = await call('GET', `/api/tasks/${taskId}`);
      const doneStage = t.json.stages.find((s: { status: string }) => s.status === 'done');
      const adv = await call('POST', `/api/tasks/${taskId}/advance`, {
        version: t.json.task.version, stage_id: doneStage?.id ?? 'none', input: 'x',
      });
      expect(adv.status).toBe(422);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
