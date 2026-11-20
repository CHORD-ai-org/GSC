import * as api from '../services/api.ts';

/* Sample workspace loader (T101「看看示例」/ T102 引导「装入示例」).
   Creates a small, human-readable set through the normal API so all
   provenance/governance paths apply. Returns created item count. */
export async function loadSampleWorkspace(): Promise<number> {
  const created: string[] = [];

  async function add(body: Record<string, unknown>): Promise<string> {
    const res = await api.createItem(body);
    const id = res.item?.id;
    if (id) created.push(id);
    return id ?? '';
  }

  const idChunk = await add({
    type: 'raw.document',
    title: 'Chunking 优于长上下文的原因',
    domain: 'knowledge', origin: 'user', status: 'active',
    fields: { content_text: '小块切分 + 检索拼装，在召回质量上稳定优于把整本手册塞进上下文。代价是需要维护切块规则与去重。' },
  });
  await add({
    type: 'raw.document',
    title: 'Light Up 交互设计笔记',
    domain: 'knowledge', origin: 'user', status: 'active',
    fields: { content_text: '采集 → 理解 → 整形 → 策展 → 点亮。每一步只做一件事，用户始终知道东西存在哪里。' },
  });
  await add({
    type: 'raw.message',
    title: '周会：同步源接入优先级',
    domain: 'work', origin: 'user', status: 'active',
    fields: { content_text: '先 GitHub issues，再 Notion。Drive 和 X 的 OAuth 审核周期长，放最后。', author: 'Team' },
  });
  await add({
    type: 'raw.evidence',
    title: '检索质量评测：语义命名的增益',
    domain: 'knowledge', origin: 'user', status: 'active',
    fields: { content_text: '同一语料下，带语义命名的切块比自动编号切块的检索命中率高 12%。', locator: 'eval-report §3.2' },
  });
  await add({
    type: 'raw.filecontent',
    title: 'API 设计原则摘录',
    domain: 'work', origin: 'user', status: 'active',
    fields: { content_text: '错误语义要可编程：400 参数错、401 未认证、403 权限不足、404 不存在、409 冲突。', filename: 'api-principles.md' },
  });
  const idCtxView = await add({
    type: 'object.concept',
    title: 'Context View（上下文视图）',
    domain: 'knowledge', origin: 'user', status: 'active',
    fields: { definition: '为特定目的组织的显式成员集合。只含显式成员，不做标签推断或相似度检索。' },
  });
  await add({
    type: 'object.hypothesis',
    title: '显式成员优于推断成员',
    domain: 'knowledge', origin: 'user', status: 'active',
    fields: { claim: '上下文视图采用显式成员，比按标签自动聚合更可控、更可解释。', reasoning: '自动聚合会在标签漂移时静默引入错误成员；显式成员的错误可被人类审出。' },
  });
  await add({
    type: 'object.methodology',
    title: '切块与命名流程',
    domain: 'knowledge', origin: 'user', status: 'active',
    fields: { name: 'Chunk & Name', steps: '1. 按语义边界切块 2. 为每块起一个说人话的名字 3. 记录来源 4. 送审命名是否达意' },
  });
  const idPglite = await add({
    type: 'object.decision',
    title: '采用 PGlite 而非外部数据库',
    domain: 'work', origin: 'user', status: 'active',
    fields: { statement: 'MVP 阶段用 PGlite 本地库，不引入外部数据库。', reasoning: '零运维、单文件备份、随应用分发；多用户与云同步出现后再迁移。' },
  });
  const idDedupe = await add({
    type: 'object.decision',
    title: '同步条目按 source_label 去重',
    domain: 'work', origin: 'user', status: 'active',
    fields: { statement: '同一 source_label 的条目不重复入库。', reasoning: '同步是幂等的：重复拉取同一条 issue 不应产生重复条目。' },
  });

  // organization samples: two clusters + one context
  const c1 = await api.createCluster({ title: '检索与命名', description: '切块、语义命名与检索质量相关条目' });
  const c1id = c1.cluster?.id;
  if (c1id) {
    for (const id of [idChunk, idCtxView].filter(Boolean)) await api.addClusterMember(c1id, id);
  }
  const c2 = await api.createCluster({ title: '产品与架构决策', description: '存储、同步与上下文视图的关键决策' });
  const c2id = c2.cluster?.id;
  if (c2id) {
    for (const id of [idPglite, idDedupe, idCtxView].filter(Boolean)) await api.addClusterMember(c2id, id);
  }
  const ctx = await api.createContext({
    title: '检索与切块评测',
    subject: '检索与切块', scope: '评测报告与证据',
    purpose: '弄清哪种切块与命名方式检索效果最好',
  });
  const ctxId = (ctx as { context?: { id: string } }).context?.id;
  if (ctxId) {
    for (const id of [idChunk, idCtxView].filter(Boolean)) await api.addContextMember(ctxId, id);
  }

  return created.length;
}


/* 一键清空（AC-102）：删除全部条目/关联组/上下文，回到空白。 */
export async function clearSampleWorkspace(): Promise<void> {
  const items = await api.listItems({});
  for (const it of items.items ?? []) {
    await api.deleteItem(it.id);
  }
  const clusters = await api.listClusters();
  for (const c of clusters.clusters ?? []) {
    await api.deleteCluster(c.id);
  }
  const contexts = await api.listContexts();
  for (const c of contexts.contexts ?? []) {
    await api.deleteContext(c.id);
  }
}
