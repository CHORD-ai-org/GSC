import { beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, type DatabaseHandle } from '../persistence/client.ts';
import { migrationSql } from '../persistence/migrate.ts';
import { createItem } from './items.ts';
import { applyOutlineTitle, ensureOutlineNodes, listOutline } from './outline.ts';
import { createProposal, resolveProposalApplying } from './proposals.ts';

let handle: DatabaseHandle;
let itemId: string;

const DOC = '# 背景\n\n项目起因与目标。\n\n# 方案\n\n分阶段实施。';

beforeAll(async () => {
  handle = createDatabase();
  await handle.exec(migrationSql());
  const item = await createItem(handle.db, {
    type: 'raw.document',
    title: 'Outline fixture',
    domain: 'knowledge',
    origin: 'user',
    fields: { content_text: DOC },
  });
  itemId = item.id;
});

describe('SEMANTIC_TITLE batch A — outline repo', () => {
  it('ensure derives nodes idempotently', async () => {
    const first = await ensureOutlineNodes(handle.db, itemId, DOC);
    expect(first.length).toBe(2);
    const second = await ensureOutlineNodes(handle.db, itemId, DOC);
    expect(second.map((n) => n.id)).toEqual(first.map((n) => n.id));
  });

  it('applyOutlineTitle marks agent origin and survives re-derivation', async () => {
    expect(await applyOutlineTitle(handle.db, itemId, '1', '项目背景与目标', 'agent')).toBe(true);
    const refreshed = await ensureOutlineNodes(handle.db, itemId, DOC);
    expect(refreshed.find((n) => n.path === '1')?.title).toBe('项目背景与目标');
    expect(refreshed.find((n) => n.path === '1')?.nameOrigin).toBe('agent');
  });

  it('user titles are never overwritten by agent proposals', async () => {
    await applyOutlineTitle(handle.db, itemId, '2', '用户自己的命名', 'user');
    expect(await applyOutlineTitle(handle.db, itemId, '2', '机器想改的名字', 'agent')).toBe(false);
    const rows = await listOutline(handle.db, itemId);
    expect(rows.find((n) => n.path === '2')?.title).toBe('用户自己的命名');
  });

  it('vanished paths drop their rows on re-derivation', async () => {
    await ensureOutlineNodes(handle.db, itemId, '# 新文档\n\n只剩一节。');
    const rows = await listOutline(handle.db, itemId);
    expect(rows.map((n) => n.path)).toEqual(['1']);
    expect(rows[0].title).not.toBe('项目背景与目标');
  });
});

describe('SEMANTIC_TITLE batch B — proposal apply wiring', () => {
  it('accepting a target_path semantic_name proposal lands the node title', async () => {
    const item = await createItem(handle.db, {
      type: 'raw.document',
      title: 'Proposal fixture',
      domain: 'knowledge',
      origin: 'user',
      fields: { content_text: '# 背景\n\n起因。\n\n# 方案\n\n做法。' },
    });
    await ensureOutlineNodes(handle.db, item.id, '# 背景\n\n起因。\n\n# 方案\n\n做法。');
    const proposal = await createProposal(handle.db, {
      kind: 'semantic_name',
      target_id: item.id,
      target_path: '1',
      proposed_value: '项目背景与起因',
      rationale: '原文：起因',
      source: 'agent',
    });
    const resolved = await resolveProposalApplying(handle.db, proposal.id, 'accepted');
    expect(resolved?.status).toBe('accepted');
    const rows = await listOutline(handle.db, item.id);
    expect(rows.find((n) => n.path === '1')).toMatchObject({ title: '项目背景与起因', nameOrigin: 'agent' });
    // path 2 untouched
    expect(rows.find((n) => n.path === '2')?.nameOrigin).toBe('rule');
  });
});
