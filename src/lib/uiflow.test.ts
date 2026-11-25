import { describe, expect, it } from 'vitest';
import { parseFlow, renderFlow, checkReferences, type FlowNode } from './uiflow.ts';

describe('G7 UI DSL 解析器（Step 6）', () => {
  it('合法解析：文法示例全过（review/collect/choose/confirm/reference/note）', () => {
    const src = [
      '!dsl v1',
      'flow "关键信息确认"',
      '  review 项目名 = GoatBed',
      '  review 时间范围 = 2026-01..2026-11',
      '  collect 整理粒度',
      '  choose 排除项: 会议纪要 | 采购单 | 不排除',
      '  reference raw_abc123',
      '  confirm write: meta_tag(project), cluster(智能床垫)',
      '  note 用户确认后写入',
    ].join('\n');
    const r = parseFlow(src);
    expect(r.ok).toBe(true);
    expect(r.version).toBe('v1');
    expect(r.title).toBe('关键信息确认');
    expect(r.degraded).toBe(false);
    expect(r.nodes.map((n) => n.type)).toEqual(['review', 'review', 'collect', 'choose', 'reference', 'confirm', 'note']);
    const confirm = r.nodes.find((n) => n.type === 'confirm');
    expect(confirm).toEqual({ type: 'confirm', actions: [{ name: 'meta_tag', arg: 'project' }, { name: 'cluster', arg: '智能床垫' }] });
  });

  it('非法词/非法动作拒绝并降级 note（原文保留）；confirm 非提案类型拒', () => {
    const src = [
      'flow "x"',
      '  exec rm -rf /',
      '  confirm write: exec(reboot)',
      '  note 正常行',
    ].join('\n');
    const r = parseFlow(src);
    expect(r.ok).toBe(true);
    expect(r.degraded).toBe(true);
    expect(r.errors).toHaveLength(2);
    const texts = r.nodes.filter((n) => n.type === 'note').map((n) => (n as { text: string }).text);
    expect(texts).toContain('exec rm -rf /'); // 降级不丢输入
    expect(texts).toContain('confirm write: exec(reboot)');
    expect(texts).toContain('正常行');
  });

  it('引用校验：checkReferences 报缺失 id', () => {
    const r = parseFlow(['flow "x"', '  reference raw_ok', '  reference raw_missing'].join('\n'));
    const missing = checkReferences(r.nodes, new Set(['raw_ok']));
    expect(missing).toEqual(['raw_missing']);
  });

  it('整流降级：缺 flow 头/未知版本 → nodes 全 note 不丢输入', () => {
    const noHead = parseFlow('  review a = b\n  note c');
    expect(noHead.ok).toBe(false);
    expect(noHead.nodes).toHaveLength(2);
    expect(noHead.nodes.every((n) => n.type === 'note')).toBe(true);

    const badVer = parseFlow('!dsl v9\nflow "x"\n  note hi');
    expect(badVer.ok).toBe(false);
    expect(badVer.version).toBe('v9');
    expect(badVer.nodes.every((n) => n.type === 'note')).toBe(true);
    expect(badVer.nodes).toHaveLength(3); // 原文三行全保留
  });

  it('限制：值超长降级；节点超 30 截断+错误', () => {
    const long = parseFlow(['flow "x"', `  review a = ${'v'.repeat(2100)}`].join('\n'));
    expect(long.degraded).toBe(true);

    const many = ['flow "x"', ...Array.from({ length: 35 }, (_, i) => `  note n${i}`)].join('\n');
    const r = parseFlow(many);
    expect(r.nodes.length).toBe(30);
    expect(r.errors.some((e) => e.includes('超限'))).toBe(true);
  });

  it('round-trip fuzz 50：renderFlow → parseFlow 恒等', () => {
    // 有界确定性 fuzz（LCG）；生成串限安全字符集（解析器以首现分隔符切分）
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const word = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789智能床垫项目';
      return Array.from({ length: 1 + Math.floor(rand() * 8) }, () => chars[Math.floor(rand() * chars.length)]).join('');
    };
    for (let round = 0; round < 50; round += 1) {
      const nodes: FlowNode[] = Array.from({ length: 1 + Math.floor(rand() * 6) }, () => {
        const pick = rand();
        if (pick < 0.2) return { type: 'review', field: word(), value: word() };
        if (pick < 0.4) return { type: 'collect', field: word() };
        if (pick < 0.6) return { type: 'choose', field: word(), options: [word(), word(), word()] };
        if (pick < 0.8) {
          const names = ['meta_tag', 'cluster', 'metadata'] as const;
          return { type: 'confirm', actions: [{ name: names[Math.floor(rand() * 3)], arg: word() }] };
        }
        return { type: 'note', text: word() };
      });
      const text = renderFlow(word(), nodes);
      const parsed = parseFlow(text);
      expect(parsed.ok).toBe(true);
      expect(parsed.degraded).toBe(false);
      expect(parsed.nodes).toEqual(nodes);
    }
  });
});
