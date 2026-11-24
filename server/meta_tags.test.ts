import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDatabase } from './persistence/client.ts';
import type { DatabaseHandle } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import {
  listMetaGroups, createTagDefinition, listTagGroupIds, createTagValue,
  setItemParams, getItemParams, filterItemIds,
} from './repo/tags.ts';
import { createProposal, resolveProposalApplying } from './repo/proposals.ts';
import { createItem } from './repo/items.ts';

async function fresh(): Promise<{ handle: DatabaseHandle; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'gsc-meta-'));
  const handle = createDatabase();
  await handle.exec(migrationSql());
  return { handle, dir };
}

describe('META_TAG_SYSTEM_V1', () => {
  it('seeds the four founder groups and supports multi-parent tags', async () => {
    const { handle, dir } = await fresh();
    try {
      const groups = await listMetaGroups(handle.db);
      expect(groups.map((g) => g.key).sort()).toEqual(['个人经历', '日志', '用户画像', '项目'].sort());

      const tag = await createTagDefinition(handle.db, {
        name: '技术栈', description: 'tech stack', group_ids: ['grp_profile', 'grp_project'],
      });
      const byTag = await listTagGroupIds(handle.db);
      expect([...(byTag.get(tag.id) ?? [])].sort()).toEqual(['grp_profile', 'grp_project'].sort());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('tagging is idempotent and carries typed assignment params', async () => {
    const { handle, dir } = await fresh();
    try {
      const def = await createTagDefinition(handle.db, { name: '技术栈', group_ids: ['grp_project'] });
      const item = await createItem(handle.db, { type: 'raw.document', title: 'A', domain: 'knowledge', origin: 'user', fields: { content_text: 'a' } });

      const first = await createTagValue(handle.db, {
        definition_id: def.id, item_id: item.id, value: 'MCP',
        params: [{ key: 'evidence', value: '从原文摘的证据', value_type: 'text' }],
      }, 'usr_local');
      expect(first.ok).toBe(true);
      if (first.ok) expect(first.value.confirmed).toBe(false);

      const again = await createTagValue(handle.db, {
        definition_id: def.id, item_id: item.id, value: 'MCP',
      }, 'usr_local');
      expect(again).toEqual({ ok: false, reason: 'conflict' }); // idempotent
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('item-level params upsert per key and filter intersections work', async () => {
    const { handle, dir } = await fresh();
    try {
      const defA = await createTagDefinition(handle.db, { name: '技术栈', group_ids: ['grp_project'] });
      const defB = await createTagDefinition(handle.db, { name: '专长', group_ids: ['grp_profile'] });
      const a = await createItem(handle.db, { type: 'raw.document', title: 'A', domain: 'knowledge', origin: 'user', fields: { content_text: 'a' } });
      const b = await createItem(handle.db, { type: 'raw.document', title: 'B', domain: 'knowledge', origin: 'user', fields: { content_text: 'b' } });

      await createTagValue(handle.db, { definition_id: defA.id, item_id: a.id, value: 'MCP' }, 'usr_local');
      await createTagValue(handle.db, { definition_id: defB.id, item_id: a.id, value: 'AI' }, 'usr_local');
      await createTagValue(handle.db, { definition_id: defB.id, item_id: b.id, value: 'AI' }, 'usr_local');

      // item params: upsert semantics
      await setItemParams(handle.db, a.id, [{ key: 'importance', value: '4' }]);
      await setItemParams(handle.db, a.id, [{ key: 'importance', value: '5' }]);
      const params = await getItemParams(handle.db, a.id);
      expect(params.find((p) => p.key === 'importance')?.value).toBe('5');

      // filters
      const byProject = await filterItemIds(handle.db, { groupId: 'grp_project' });
      expect(byProject).toEqual([a.id]);
      const byProfile = await filterItemIds(handle.db, { groupId: 'grp_profile' });
      expect([...(byProfile ?? [])].sort()).toEqual([a.id, b.id].sort());
      const byTag = await filterItemIds(handle.db, { tagId: defA.id });
      expect(byTag).toEqual([a.id]);
      const byParam = await filterItemIds(handle.db, { params: { importance: '5' } });
      expect(byParam).toEqual([a.id]);
      // intersection: profile group + importance=5 → only a
      const both = await filterItemIds(handle.db, { groupId: 'grp_profile', params: { importance: '5' } });
      expect(both).toEqual([a.id]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('meta_tag proposal accept lands a confirmed assignment (D-066)', async () => {
    const { handle, dir } = await fresh();
    try {
      const def = await createTagDefinition(handle.db, { name: '项目', group_ids: ['grp_project'] });
      const item = await createItem(handle.db, { type: 'raw.document', title: 'X', domain: 'knowledge', origin: 'user', fields: { content_text: 'x' } });

      const p = await createProposal(handle.db, {
        kind: 'meta_tag',
        target_id: item.id,
        related_definition_id: def.id,
        proposed_value: 'GSC',
        rationale: 'suggested',
        source: 'agent',
      });
      const resolved = await resolveProposalApplying(handle.db, p.id, 'accepted');
      expect(resolved?.status).toBe('accepted');

      const { listTagValues } = await import('./repo/tags.ts');
      const values = await listTagValues(handle.db, { itemId: item.id });
      expect(values).toHaveLength(1);
      expect(values[0].definition_id).toBe(def.id);
      expect(values[0].value).toBe('GSC');
      expect(values[0].confirmed).toBe(true); // accept = user confirmation
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
