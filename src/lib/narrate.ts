/**
 * OVERVIEW_REDESIGN OV3：活动流叙事模板（纯函数，可测）。
 * 入参=overview/feed 的行（事件/提案原始 verb/kind）；出参=人话短句。
 * 语言风格（创始人笔记自注「语言会先经过一次美化」）：第三人称活泼叙事；
 * 真实数据不变，只做动词映射——不改事实、不加事实。
 */

export type FeedLine = { at: string; actor: string; kind: 'event' | 'proposal'; verb: string; target_title: string };

const EVENT_VERBS: Record<string, (title: string) => string> = {
  created: (title) => `写下了「${title}」`,
  updated: (title) => `为「${title}」添了新笔墨`,
  viewed: (title) => `查看了「${title}」的文档`,
  archived: (title) => `把「${title}」请进了档案柜`,
  restored: (title) => `从档案柜里找回了「${title}」`,
  renamed: (title) => `给「${title}」换了个新名字`,
};

const PROPOSAL_VERBS: Record<string, (title: string) => string> = {
  meta_tag: (title) => `给「${title}」挑好了一枚称心的标签`,
  semantic_name: (title) => `为「${title}」想好了名字`,
  cluster: (title) => `觉得「${title}」该有个归处`,
  classification: (title) => `把「${title}」的类目理清了`,
  metadata: (title) => `细查了「${title}」的来龙去脉`,
  association: (title) => `发现「${title}」与别处心意相通`,
  dedupe: (title) => `警觉地发现「${title}」疑似重复`,
  pending_definition: (title) => `从「${title}」里嗅到了一枚新标签`,
};

export function narrate(entry: FeedLine): string {
  const who = entry.actor === 'user' ? '你' : 'Agent ';
  const title = titleSafe(entry);
  if (entry.kind === 'proposal') {
    const f = PROPOSAL_VERBS[entry.verb];
    return f ? `Agent ${f(title)}` : `Agent 对「${title}」有了一条新念头`;
  }
  const f = EVENT_VERBS[entry.verb];
  return f ? `${who}${f(title)}` : `${who}在「${title}」上动了动`;
}

function titleSafe(entry: FeedLine): string {
  return entry.target_title || '（已删除条目）';
}
