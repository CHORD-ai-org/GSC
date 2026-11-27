import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDatabase } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import { createItem } from './repo/items.ts';
import { appendEvent } from './repo/events.ts';
import { createProposal } from './repo/proposals.ts';
import { overviewFeed, overviewStats } from './repo/overview.ts';

async function fresh(): Promise<{ handle: ReturnType<typeof createDatabase>; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'gsc-ov-'));
  const handle = createDatabase();
  await handle.exec(migrationSql());
  return { handle, dir };
}

describe('OVERVIEW_REDESIGN OV-BE', () => {
  it('stats：今日 items/proposals 计数 + 7 日桶齐全', async () => {
    const { handle, dir } = await fresh();
    try {
      const a = await createItem(handle.db, { type: 'raw.document', title: 'A', domain: 'user', origin: 'user', fields: {} });
      const b = await createItem(handle.db, { type: 'raw.document', title: 'B', domain: 'user', origin: 'user', fields: {} });
      await appendEvent(handle.db, { item_id: a.id, actor: 'user', action: 'created', detail: '' });
      await appendEvent(handle.db, { item_id: b.id, actor: 'agent', action: 'created', detail: '' });
      await createProposal(handle.db, { kind: 'cluster', target_id: a.id, proposed_value: 'x', rationale: 'r', source: 'detector' });
      const s = await overviewStats(handle.db);
      expect(s.days).toHaveLength(7);
      expect(s.days[6].count).toBeGreaterThanOrEqual(2); // 今日事件入桶
      expect(s.today_items).toBe(2);
      expect(s.today_proposals).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('feed：events+proposals 合流倒序 + 条目标题 join', async () => {
    const { handle, dir } = await fresh();
    try {
      const a = await createItem(handle.db, { type: 'raw.document', title: '架构笔记', domain: 'user', origin: 'user', fields: {} });
      await appendEvent(handle.db, { item_id: a.id, actor: 'agent', action: 'created', detail: '' });
      await createProposal(handle.db, { kind: 'semantic_name', target_id: a.id, proposed_value: '架构笔记', rationale: 'r', source: 'agent' });
      const feed = await overviewFeed(handle.db, 12);
      expect(feed.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < feed.length; i += 1) {
        expect(feed[i - 1].at >= feed[i].at).toBe(true); // 倒序
      }
      expect(feed.some((f) => f.kind === 'event' && f.target_title === '架构笔记')).toBe(true);
      expect(feed.some((f) => f.kind === 'proposal' && f.verb === 'semantic_name')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
