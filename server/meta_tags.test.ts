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

describe('META_TAG pending_definition flow (G5 收尾)', () => {
  it('suggestMetaTags surfaces invented tags as new:<name> suggestions', async () => {
    const config = (await import('./config.ts')).readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'k' });
    const { suggestMetaTags } = await import('./agent/proposer.ts');
    const fakeFetch = async () => new Response(JSON.stringify({
      choices: [{ message: { content: '{"tags":[],"new_tags":[{"item":"i1","name":"转折点","value":"2026-03","why":"career pivot"}]}' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    const out = await suggestMetaTags(config, [{ id: 'i1', title: 'a', content: 'x' }], [], fakeFetch as unknown as typeof fetch);
    expect(out).toEqual([{
      item_id: 'i1', definition_id: 'new:转折点', new_name: '转折点', value: '2026-03', why: 'career pivot',
    }]);
  });

  it('meta_tag accept is blocked on new: refs until pending_definition is accepted, then flows', async () => {
    const { handle, dir } = await fresh();
    try {
      const item = await createItem(handle.db, { type: 'raw.document', title: 'X', domain: 'knowledge', origin: 'user', fields: { content_text: 'x' } });

      // pipeline-shaped pair: pending_definition + meta_tag with new: ref
      const pd = await createProposal(handle.db, {
        kind: 'pending_definition', target_id: item.id, proposed_value: '转折点', rationale: 'new tag', source: 'agent',
      });
      const mt = await createProposal(handle.db, {
        kind: 'meta_tag', target_id: item.id, related_definition_id: 'new:转折点',
        proposed_value: '2026-03', rationale: 'career pivot', source: 'agent',
      });

      // 1) accepting meta_tag first is blocked — stays pending, no assignment
      const blocked = await resolveProposalApplying(handle.db, mt.id, 'accepted');
      expect(blocked?.status).toBe('pending');
      const { listTagValues } = await import('./repo/tags.ts');
      expect(await listTagValues(handle.db, { itemId: item.id })).toHaveLength(0);

      // 2) accept pending_definition → definition created + ref upgraded
      const pdDone = await resolveProposalApplying(handle.db, pd.id, 'accepted');
      expect(pdDone?.status).toBe('accepted');
      const defs = await (await import('./repo/tags.ts')).listTagDefinitions(handle.db);
      const def = defs.find((d) => d.name === '转折点');
      expect(def).toBeTruthy();

      // 3) accept the (upgraded) meta_tag → assignment lands confirmed
      const done = await resolveProposalApplying(handle.db, mt.id, 'accepted');
      expect(done?.status).toBe('accepted');
      const values = await listTagValues(handle.db, { itemId: item.id });
      expect(values).toHaveLength(1);
      expect(values[0].definition_id).toBe(def!.id);
      expect(values[0].confirmed).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('META_TAG_PIPELINE（M1/M2/M3）：识别管线', () => {
  async function seed(handle: DatabaseHandle, term: string, count = 3) {
    const { createTagDefinition } = await import('./repo/tags.ts');
    await createTagDefinition(handle.db, { name: '数据库', group_ids: ['grp_project'] });
    for (let i = 0; i < count; i += 1) {
      await createItem(handle.db, {
        type: 'raw.document', title: `${term} 笔记 ${i + 1}`, domain: 'knowledge', origin: 'user',
        fields: { content_text: `${term} deployment guide part ${i + 1}` },
      });
    }
  }

  function chat(content: string): Response {
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }

  /** 按系统提示路由：打标建议 vs discovery 命名。 */
  function router(tagReply: string, nameReply: string, failAlways = false): typeof fetch {
    return (async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { messages?: { role: string; content: string }[] };
      const sys = (body.messages ?? []).find((m) => m.role === 'system')?.content ?? '';
      if (failAlways) throw new Error('LLM HTTP 401: Invalid API Key');
      if (sys.includes('Assign meta tags')) return chat(tagReply);
      if (sys.includes('Merge these frequent terms')) return chat(nameReply);
      return chat('{}');
    }) as typeof fetch;
  }

  it('M1 meta_tag 维：LLM 建议 → meta_tag 提案；无配置时规则维照跑（llm=absent）', async () => {
    const { handle, dir } = await fresh();
    try {
      const { runDetection } = await import('./agent/detector.ts');
      const { listProposals } = await import('./repo/proposals.ts');
      const config = (await import('./config.ts')).readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'k' });
      await seed(handle, 'kubernetes', 2);
      const defId = (await (await import('./repo/tags.ts')).listTagDefinitions(handle.db))[0].id;
      const fetchImpl = router(
        JSON.stringify({ tags: [{ item: (await (await import('./repo/items.ts')).listItems(handle.db))[0].id, definition: defId, value: 'deploy notes', why: 'w' }], new_tags: [] }),
        '{"names":[]}',
      );
      const report = await runDetection(handle.db, { config, fetchImpl });
      expect(report.meta_tag).toBe(1);
      expect(report.llm).toBe('ok');
      expect(report.metadata).toBeGreaterThanOrEqual(1); // 规则维与 LLM 维同轮各跑
      const props = await listProposals(handle.db, 'pending');
      expect(props.some((p) => p.kind === 'meta_tag')).toBe(true);

      // 无配置：llm=absent；规则维产物被幂等去重（r1 已产 metadata 提案）
      const r2 = await runDetection(handle.db);
      expect(r2.llm).toBe('absent');
      expect(r2.metadata).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('M1 降级：fetch 401 → llm=skipped，规则维不受影响', async () => {
    const { handle, dir } = await fresh();
    try {
      const { runDetection } = await import('./agent/detector.ts');
      const { listProposals } = await import('./repo/proposals.ts');
      const config = (await import('./config.ts')).readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'k' });
      await seed(handle, 'redis', 3); // 3 条共享词元 → discovery 命名步会真正调 LLM（该步不吞错）
      const fetchImpl = router('{}', '{}', true);
      const report = await runDetection(handle.db, { config, fetchImpl });
      expect(report.llm).toBe('skipped');
      const props = await listProposals(handle.db, 'pending');
      expect(props.some((p) => p.kind === 'metadata')).toBe(true); // 规则维产物保留
      expect(props.some((p) => p.kind === 'meta_tag')).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('M3 discovery：规则候选→LLM 命名→pending_definition；同名跨轮不重复', async () => {
    const { handle, dir } = await fresh();
    try {
      const { runDetection } = await import('./agent/detector.ts');
      const { listProposals } = await import('./repo/proposals.ts');
      const config = (await import('./config.ts')).readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'k' });
      await seed(handle, 'kubernetes', 3); // 3 条共享词元 kubernetes → df=3 命中候选
      const fetchImpl = router('{"tags":[],"new_tags":[]}', '{"names":["K8s 运维"]}');
      const r1 = await runDetection(handle.db, { config, fetchImpl });
      expect(r1.candidates).toBeGreaterThanOrEqual(1);
      expect(r1.discovered).toBe(1);
      const props = await listProposals(handle.db, 'pending');
      const pd = props.filter((p) => p.kind === 'pending_definition');
      expect(pd).toHaveLength(1);
      expect(pd[0].proposed_value.toLowerCase()).toBe('k8s 运维');

      // 跨轮同名不重复
      const r2 = await runDetection(handle.db, { config, fetchImpl });
      expect(r2.discovered).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('M2 ingest 钩子：maybeDetectOnIngest 增量跑 + 开关关闭生效', async () => {
    const { handle, dir } = await fresh();
    try {
      const { maybeDetectOnIngest } = await import('./agent/detector.ts');
      const { listProposals } = await import('./repo/proposals.ts');
      const config = (await import('./config.ts')).readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'k' });
      await seed(handle, 'docker', 1);
      const fetchImpl = router('{}', '{}');
      const ids = (await (await import('./repo/items.ts')).listItems(handle.db)).map((i) => i.id);

      const prev = process.env.GSC_DETECT_ON_INGEST;
      process.env.GSC_DETECT_ON_INGEST = '0';
      await maybeDetectOnIngest(handle.db, config, ids);
      expect((await listProposals(handle.db, 'pending')).length).toBe(0); // 关闭=零提案

      process.env.GSC_DETECT_ON_INGEST = '1';
      await maybeDetectOnIngest(handle.db, config, ids);
      expect((await listProposals(handle.db, 'pending')).length).toBeGreaterThanOrEqual(1); // metadata 规则维
      if (prev === undefined) delete process.env.GSC_DETECT_ON_INGEST; else process.env.GSC_DETECT_ON_INGEST = prev;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
