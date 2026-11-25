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
import { createConversation, listConversations, addMessage, listMessages } from './repo/chat.ts';

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

describe('GSC 对话骨架（SIDEBAR_PLAN 数据源）', () => {
  it('conversations/messages CRUD + routes round-trip', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-conv-'));
    try {
      const handle: DatabaseHandle = createDatabase();
      await handle.exec(migrationSql());
      const conv = await createConversation(handle.db, '智能床垫数据整理');
      expect(conv.title).toBe('智能床垫数据整理');
      await addMessage(handle.db, conv.id, 'user', '整理一下数据');
      await addMessage(handle.db, conv.id, 'agent', '好的，先查找');
      expect(await listMessages(handle.db, conv.id)).toHaveLength(2);
      expect((await listConversations(handle.db)).map((c) => c.id)).toContain(conv.id);

      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite') });
      const router = createApiRouter(config, handle.db);
      const call = async (method: string, url: string, body?: unknown) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };
      const list = await call('GET', '/api/conversations');
      expect(list.json.conversations).toHaveLength(1);
      const created = await call('POST', '/api/conversations', { title: '信念修正研究' });
      expect(created.status).toBe(201);
      const msgs = await call('GET', `/api/conversations/${conv.id}/messages`);
      expect(msgs.json.messages).toHaveLength(2);
      expect((await call('GET', '/api/conversations/cnv_none/messages')).status).toBe(404);
      await handle.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
