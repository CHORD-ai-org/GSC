import { describe, expect, it } from 'vitest';
import { narrate } from './narrate.ts';

describe('OV3 叙事模板', () => {
  it('事件按 actor 区分你/Agent，动词映射为人话', () => {
    expect(narrate({ at: '', actor: 'user', kind: 'event', verb: 'viewed', target_title: 'Novbee 项目文档' })).toBe('你查看了「Novbee 项目文档」的文档');
    expect(narrate({ at: '', actor: 'agent', kind: 'event', verb: 'created', target_title: '架构笔记' })).toBe('Agent 写下了「架构笔记」');
    expect(narrate({ at: '', actor: 'user', kind: 'event', verb: 'teleported', target_title: 'X' })).toContain('动了动');
  });
  it('提案映射为 Agent 叙事句', () => {
    expect(narrate({ at: '', actor: 'agent', kind: 'proposal', verb: 'semantic_name', target_title: 'GoatBed' })).toBe('Agent 为「GoatBed」想好了名字');
    expect(narrate({ at: '', actor: 'detector', kind: 'proposal', verb: 'dedupe', target_title: 'A' })).toContain('疑似重复');
    expect(narrate({ at: '', actor: 'detector', kind: 'proposal', verb: 'weird', target_title: 'B' })).toContain('新念头');
  });
  it('空标题兜底「已删除条目」', () => {
    expect(narrate({ at: '', actor: 'user', kind: 'event', verb: 'viewed', target_title: '' })).toContain('已删除条目');
  });
});
