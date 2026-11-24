import { describe, expect, it } from 'vitest';
import { suggestTitles } from './titler.ts';
import { readConfig } from '../config.ts';

const config = readConfig({ GSC_LLM_API_KEY: 'test' });

function stubFetch(replies: string[]): (url: string, init?: RequestInit) => Promise<Response> {
  let call = 0;
  return async () => {
    const body = replies[Math.min(call, replies.length - 1)];
    call += 1;
    return new Response(JSON.stringify({ choices: [{ message: { content: body } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}

const NODES = [
  { path: '1', level: 1, text: '周会改期至周四 14:00，地点 A305。' },
  { path: '2', level: 1, text: '请带 slides 与上周进度表。' },
];

describe('SEMANTIC_TITLE batch B — titler', () => {
  it('parses a JSON array reply, trims and caps titles, filters unknown paths', async () => {
    const out = await suggestTitles(config, '会议纪要', NODES, [], stubFetch([
      JSON.stringify([
        { path: '1', title: '  周会改期至周四 14:00  ', rationale: '原文：周会改期' },
        { path: '2', title: '需带 slides', rationale: '' },
        { path: '99', title: '不该出现', rationale: '' },
      ]),
    ]));
    expect(out.map((c) => c.path)).toEqual(['1', '2']);
    expect(out[0].title).toBe('周会改期至周四 14:00');
  });

  it('tolerates object-wrapped arrays (contract tolerance, same as proposer)', async () => {
    const out = await suggestTitles(config, null, [NODES[0]], [], stubFetch([
      JSON.stringify({ suggestions: [{ path: '1', title: '时间变更', rationale: '' }] }),
    ]));
    expect(out).toEqual([{ path: '1', title: '时间变更', rationale: '' }]);
  });

  it('regenerates duplicate titles once and drops still-duplicates', async () => {
    const out = await suggestTitles(config, null, NODES, [{ path: '3', title: '已确认标题' }], stubFetch([
      // first call: both come back with the SAME title → collision
      JSON.stringify([
        { path: '1', title: '重复标题', rationale: '' },
        { path: '2', title: '重复标题', rationale: '' },
      ]),
      // retry for both: one distinct, one still a dupe of a confirmed title
      JSON.stringify([
        { path: '1', title: '时间变更', rationale: '' },
        { path: '2', title: '已确认标题', rationale: '' },
      ]),
    ]));
    // path 2 stays rule ("待改"); only path 1 gets a proposal-quality title
    expect(out.map((c) => c.path)).toEqual(['1']);
    expect(out[0].title).toBe('时间变更');
  });

  it('propagates LLM failures to the caller (endpoint catches per group)', async () => {
    const failing = async () => new Response('nope', { status: 500 });
    await expect(suggestTitles(config, null, NODES, [], failing)).rejects.toThrow();
  });
});
