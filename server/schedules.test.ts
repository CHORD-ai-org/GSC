import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readConfig } from './config.ts';
import { createApiRouter } from './router.ts';
import { createDatabase } from './persistence/client.ts';
import type { DatabaseHandle } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import { createApiToken } from './storage/tokens.ts';
import { runDueSchedules, runScheduleNow } from './intel/scheduler.ts';

function fakeRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    body: '',
    headers,
    setHeader(name: string, value: string) { headers[name] = String(value); },
    end(chunk?: string) { res.body = chunk ?? ''; },
  };
  return res;
}

function fakeReq(method: string, url: string, body?: unknown, token?: string): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  const req = Readable.from([payload]) as IncomingMessage;
  req.method = method;
  req.url = url;
  if (token) req.headers = { authorization: `Bearer ${token}` };
  return req;
}

async function fresh(): Promise<{ handle: DatabaseHandle; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'gsc-sched-'));
  const handle = createDatabase();
  await handle.exec(migrationSql());
  return { handle, dir };
}

describe('LOCAL_SIM schedules (cloud-isomorphic collection)', () => {
  it('CRUD round-trips through the routes with contract guards', async () => {
    const { handle, dir } = await fresh();
    try {
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite'), GSC_AUTH_REQUIRED: '1' });
      const router = createApiRouter(config, handle.db);
      const call = async (method: string, url: string, body?: unknown, token?: string) => {
        const res = fakeRes();
        await router(fakeReq(method, url, body, token) as IncomingMessage, res as unknown as ServerResponse, () => {});
        return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
      };
      const tokenRoot = createApiToken(dir, 'root', 'rw');
      const user = await call('POST', '/api/users', { name: 'S' }, tokenRoot.token);
      const token = createApiToken(dir, 's', 'rw', user.json.user.id);

      // contract: folder needs root_path, web needs url_list
      expect((await call('POST', '/api/schedules', { name: 'x', kind: 'folder' }, token.token)).status).toBe(400);
      expect((await call('POST', '/api/schedules', { name: 'x', kind: 'web' }, token.token)).status).toBe(400);

      const created = await call('POST', '/api/schedules', {
        name: 'demo folder', kind: 'folder', root_path: '/tmp/x', interval_min: 5,
      }, token.token);
      expect(created.status).toBe(201);
      const id = created.json.schedule.id;

      const list = await call('GET', '/api/schedules', undefined, token.token);
      expect(list.json.schedules).toHaveLength(1);

      const patched = await call('PATCH', `/api/schedules/${id}`, { interval_min: 10, enabled: false }, token.token);
      expect(patched.json.schedule.interval_min).toBe(10);
      expect(patched.json.schedule.enabled).toBe(false);

      expect((await call('DELETE', `/api/schedules/${id}`, undefined, token.token)).json.deleted).toBe(true);
      expect((await call('GET', '/api/schedules', undefined, token.token)).json.schedules).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('folder scan is hash-incremental: new files import once, rescans are zero', async () => {
    const { handle, dir } = await fresh();
    try {
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite') });
      const watch = path.join(dir, 'watch');
      mkdirSync(watch, { recursive: true });
      writeFileSync(path.join(watch, 'a.md'), '# A\n\nfirst note', 'utf-8');
      writeFileSync(path.join(watch, 'b.txt'), 'second note', 'utf-8');

      const { createSchedule } = await import('./repo/schedules.ts');
      const { listItems } = await import('./repo/items.ts');
      const sched = await createSchedule(handle.db, {
        name: 'watch', kind: 'folder', root_path: watch, interval_min: 1,
      }, 'usr_local');

      const first = await runScheduleNow(handle.db, config, sched.id);
      expect(first.ok).toBe(true);
      const afterFirst = (await listItems(handle.db)).length;
      expect(afterFirst).toBe(2);

      const second = await runScheduleNow(handle.db, config, sched.id);
      expect(second.ok).toBe(true);
      expect((await listItems(handle.db)).length).toBe(afterFirst); // unchanged rescan — zero new

      writeFileSync(path.join(watch, 'c.md'), '# C\n\nnew file', 'utf-8');
      await runScheduleNow(handle.db, config, sched.id);
      expect((await listItems(handle.db)).length).toBe(afterFirst + 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('due gating honours the interval and the running lock', async () => {
    const { handle, dir } = await fresh();
    try {
      const config = readConfig({ PGLITE_DIR: path.join(dir, 'pglite') });
      const { createSchedule, updateSchedule, getSchedule } = await import('./repo/schedules.ts');
      const watch = path.join(dir, 'watch');
      mkdirSync(watch, { recursive: true });
      const sched = await createSchedule(handle.db, {
        name: 'gated', kind: 'folder', root_path: watch, interval_min: 5,
      }, 'usr_local');

      // never run → due immediately
      expect((await runDueSchedules(handle.db, config)).ran).toBe(1);
      const after = await getSchedule(handle.db, sched.id);
      expect(after?.last_run_at).toBeTruthy();

      // just ran → not due again for 5 minutes
      expect((await runDueSchedules(handle.db, config)).ran).toBe(0);

      // disabled → never due
      await updateSchedule(handle.db, sched.id, { enabled: false });
      expect((await runDueSchedules(handle.db, config)).ran).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
