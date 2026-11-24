import { describe, expect, it } from 'vitest';
import { deriveOutline, MAX_LEVEL } from './outline.ts';

describe('SEMANTIC_TITLE batch A — outline derivation', () => {
  it('heading mode: nests by heading depth, clamped to 4 levels, offsets round-trip', () => {
    const text = [
      '# 项目周会纪要', // L1
      '开场回顾上周进度与风险。',
      '## 时间变更', // L2
      '周会改期至周四 14:00。',
      '### 地点细节', // L3
      '地点 A305。',
      '#### 补充说明', // L4
      '请带 slides。',
      '##### 超深标题', // clamped to L4
      '深度内容。',
    ].join('\n\n');
    const nodes = deriveOutline(text);
    expect(nodes.map((n) => n.path)).toEqual(['1', '1.1', '1.1.1', '1.1.1.1', '1.1.1.2']);
    expect(nodes.map((n) => n.level)).toEqual([1, 2, 3, 4, MAX_LEVEL]);
    for (const node of nodes) {
      const slice = text.slice(node.start, node.end);
      expect(slice.length, node.path).toBeGreaterThan(0);
      expect(slice.trim().startsWith('#') || slice.trim().length > 0, node.path).toBe(true);
    }
  });

  it('prose mode short doc (≤5 paragraphs): one level, one node per paragraph', () => {
    const text = '第一段讲背景。\n\n第二段讲方案。\n\n第三段讲排期。';
    const nodes = deriveOutline(text);
    expect(nodes.map((n) => n.path)).toEqual(['1', '2', '3']);
    expect(nodes.every((n) => n.level === 1)).toBe(true);
    expect(text.slice(nodes[1].start, nodes[1].end)).toBe('第二段讲方案。');
  });

  it('prose mode long doc: ≤5 L1 groups with L2 paragraph children', () => {
    const paras = Array.from({ length: 12 }, (_, i) => `段落${i + 1}：内容第 ${i + 1} 条。`);
    const text = paras.join('\n\n');
    const nodes = deriveOutline(text);
    const l1 = nodes.filter((n) => n.level === 1);
    const l2 = nodes.filter((n) => n.level === 2);
    expect(l1.length).toBeLessThanOrEqual(5);
    expect(l1.length).toBeGreaterThan(1);
    expect(l2.length).toBe(12);
    // every L2 child's span sits inside its L1 parent's span
    for (const child of l2) {
      const parent = l1.find((n) => child.path.startsWith(`${n.path}.`))!;
      expect(child.start).toBeGreaterThanOrEqual(parent.start);
      expect(child.end).toBeLessThanOrEqual(parent.end);
    }
    // offsets round-trip for a sample
    expect(text.slice(l2[0].start, l2[0].end)).toBe(paras[0]);
  });

  it('empty/blank input yields no nodes', () => {
    expect(deriveOutline('')).toEqual([]);
    expect(deriveOutline('  \n\n  ')).toEqual([]);
  });

  it('single short heading doc stays prose (heading mode needs ≥2 headings)', () => {
    const nodes = deriveOutline('# 只有一个标题\n\n正文段落。');
    expect(nodes.length).toBeGreaterThan(0);
  });
});
