/**
 * G7 UI DSL 解析器（GSC_CHAT_PLAN §1.5，Step 6）：行式 tokenizer → AST → 四道校验 →
 * 降级链（单行降级 note / 整流降级普通表单，均不丢输入）。
 *
 * 文法（line-oriented，缩进=步骤）：
 *   !dsl v1                      （可选版本标；未知版本 → 整流降级）
 *   flow "<title>"
 *     review <字段> = <预填值>
 *     collect <字段>
 *     choose <字段>: <选项> | <选项>
 *     confirm write: <提案动作>(<参数>), ...
 *     note <说明>
 *     reference <条目id>
 *
 * 安全：只识别词表内语法；任何其它内容降级为 note 文本（无脚本/样式/网络/查询解释）。
 */

export type FlowNode =
  | { type: 'review'; field: string; value: string }
  | { type: 'collect'; field: string }
  | { type: 'choose'; field: string; options: string[] }
  | { type: 'confirm'; actions: { name: string; arg: string }[] }
  | { type: 'note'; text: string }
  | { type: 'reference'; ref: string };

export type ParseResult = {
  /** 整流成功（false=整流降级为普通表单数据源，nodes 全为 note） */
  ok: boolean;
  version: string;
  title: string;
  nodes: FlowNode[];
  /** 行级错误（对应行已降级 note，原文保留） */
  errors: string[];
  /** 存在行级降级 */
  degraded: boolean;
};

export const FLOW_ACTIONS = [
  'meta_tag', 'cluster', 'semantic_name', 'classification', 'metadata', 'association', 'dedupe', 'pending_definition',
] as const;

const MAX_NODES = 30;
const MAX_FIELD = 40;
const MAX_VALUE = 2000;
const MAX_TITLE = 80;
const SAFE_VALUE = /[\u0020-\u007e\u4e00-\u9fa5]/; // 可见 ASCII + CJK

function noteOf(text: string): FlowNode {
  return { type: 'note', text: text.slice(0, MAX_VALUE) };
}

function parseConfirmActions(rest: string): { name: string; arg: string }[] | null {
  const parts = rest.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const actions: { name: string; arg: string }[] = [];
  for (const part of parts) {
    const m = /^([a-z_]+)\s*\(([^)]*)\)$/.exec(part);
    if (!m) return null;
    const [, name, arg] = m;
    if (!(FLOW_ACTIONS as readonly string[]).includes(name)) return null; // ④ confirm 动作必须是提案类型
    if (arg.length > MAX_FIELD) return null;
    actions.push({ name, arg: arg.trim() });
  }
  return actions;
}

function parseLine(line: string): { ok: true; node: FlowNode } | { ok: false; reason: string } {
  const clean = line.replace(/[\u0000-\u001f]/g, '').trim();
  if (!clean) return { ok: false, reason: 'empty' };

  if (clean.startsWith('review ')) {
    const body = clean.slice(7);
    const eq = body.indexOf(' = ');
    if (eq < 0) return { ok: false, reason: 'review 需要 "字段 = 值"' };
    const field = body.slice(0, eq).trim();
    const value = body.slice(eq + 3).trim();
    if (!field || field.length > MAX_FIELD) return { ok: false, reason: '字段名非法' }; // ② 字段类型
    if (!SAFE_VALUE.test(value) || value.length > MAX_VALUE) return { ok: false, reason: '值非法' };
    return { ok: true, node: { type: 'review', field, value } };
  }
  if (clean.startsWith('collect ')) {
    const field = clean.slice(8).trim();
    if (!field || field.length > MAX_FIELD) return { ok: false, reason: '字段名非法' };
    return { ok: true, node: { type: 'collect', field } };
  }
  if (clean.startsWith('choose ')) {
    const body = clean.slice(7);
    const colon = body.indexOf(': ');
    if (colon < 0) return { ok: false, reason: 'choose 需要 "字段: 选项 | 选项"' };
    const field = body.slice(0, colon).trim();
    const options = body.slice(colon + 2).split('|').map((o) => o.trim()).filter(Boolean).slice(0, 12);
    if (!field || field.length > MAX_FIELD || options.length < 2) return { ok: false, reason: 'choose 需 ≥2 选项' };
    if (options.some((o) => o.length > MAX_FIELD)) return { ok: false, reason: '选项过长' };
    return { ok: true, node: { type: 'choose', field, options } };
  }
  if (clean.startsWith('confirm write:')) {
    const actions = parseConfirmActions(clean.slice('confirm write:'.length).trim());
    if (!actions) return { ok: false, reason: 'confirm 动作必须是提案类型' };
    return { ok: true, node: { type: 'confirm', actions } };
  }
  if (clean.startsWith('note ')) {
    return { ok: true, node: noteOf(clean.slice(5).trim()) };
  }
  if (clean.startsWith('reference ')) {
    const ref = clean.slice(10).trim();
    if (!/^[\w:.-]{1,120}$/.test(ref)) return { ok: false, reason: '引用 id 非法' }; // ③ 形态校验（存在性由 checkReferences 查）
    return { ok: true, node: { type: 'reference', ref } };
  }
  return { ok: false, reason: '未知语法' }; // ① 词表白名单
}

/** 解析整流（含降级链）。 */
export function parseFlow(text: string): ParseResult {
  const rawLines = text.split(/\r?\n/);
  const errors: string[] = [];
  let degraded = false;
  let version = 'v1';
  let title = '';
  let started = false;

  const allNotes = (lines: string[]): FlowNode[] => lines
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_NODES)
    .map((l) => noteOf(l));

  const nodes: FlowNode[] = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!started && trimmed.startsWith('!dsl')) {
      const v = trimmed.slice(4).trim();
      if (v !== 'v1') {
        // 未知版本 → 整流降级（不丢输入）
        return { ok: false, version: v || 'unknown', title: '', nodes: allNotes(rawLines), errors: [`未知 DSL 版本 ${v}`], degraded: true };
      }
      version = 'v1';
      continue;
    }
    if (!started && trimmed.startsWith('flow')) {
      const m = /^flow\s+"([^"]*)"|^flow\s+(.+)$/.exec(trimmed);
      const t = (m?.[1] ?? m?.[2] ?? '').trim();
      if (!t) return { ok: false, version, title: '', nodes: allNotes(rawLines), errors: ['缺少 flow 标题'], degraded: true };
      title = t.slice(0, MAX_TITLE);
      started = true;
      continue;
    }
    if (!started) {
      return { ok: false, version, title: '', nodes: allNotes(rawLines), errors: ['缺少 flow 头'], degraded: true };
    }
    if (nodes.length >= MAX_NODES) {
      errors.push(`节点超限（>${MAX_NODES}），其余丢弃`);
      degraded = true;
      break;
    }
    const result = parseLine(line);
    if (result.ok) {
      nodes.push(result.node);
    } else {
      if (result.reason === 'empty') continue;
      errors.push(`第 ${i + 1} 行：${result.reason}`);
      nodes.push(noteOf(trimmed)); // 降级 note，原文保留
      degraded = true;
    }
  }
  if (!started) {
    return { ok: false, version, title: '', nodes: allNotes(rawLines), errors: ['缺少 flow 头'], degraded: true };
  }
  return { ok: true, version, title, nodes, errors, degraded };
}

/** ③ reference 存在性校验：返回不存在的引用 id。 */
export function checkReferences(nodes: FlowNode[], known: Set<string> | ((id: string) => boolean)): string[] {
  const has = known instanceof Set ? (id: string) => known.has(id) : known;
  return nodes.filter((n): n is Extract<FlowNode, { type: 'reference' }> => n.type === 'reference')
    .map((n) => n.ref)
    .filter((id) => !has(id));
}

/** 逆向渲染（round-trip/测试/uispec 模板共用）。 */
export function renderFlow(title: string, nodes: FlowNode[]): string {
  const lines = [`flow "${title.replace(/"/g, "'")}"`];
  for (const n of nodes) {
    if (n.type === 'review') lines.push(`  review ${n.field} = ${n.value}`);
    else if (n.type === 'collect') lines.push(`  collect ${n.field}`);
    else if (n.type === 'choose') lines.push(`  choose ${n.field}: ${n.options.join(' | ')}`);
    else if (n.type === 'confirm') lines.push(`  confirm write: ${n.actions.map((a) => `${a.name}(${a.arg})`).join(', ')}`);
    else if (n.type === 'note') lines.push(`  note ${n.text}`);
    else if (n.type === 'reference') lines.push(`  reference ${n.ref}`);
  }
  return lines.join('\n');
}
