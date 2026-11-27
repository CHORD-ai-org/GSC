/**
 * USER_PROFILE_INIT_PLAN U1：初始用户画像构建管线（屏幕 2 的后端）。
 * 流程：源采集（屏 1）→ 本管线（Meta User Profile 锚点 + 用户画像组打标提案 +
 * 伴灵名 Tau）→ 校准裁决（原型「已完成/容我介绍」=提案制，D-042）→ 引导（屏 3）。
 *
 * 文献对齐（2026-11-26 检索）：ai-know-you 五阶段的 Calibration=本管线的提案裁决；
 * 画像条目三字段（结论/来源/置信度）→ proposal 的 value/source/rationale 承载；
 * 渐进披露 → 打标建议限用户画像/个人经历两组（3–5 甜点区）；
 * Birth System 的外部合成 → suggestMetaTags 外部合成初始画像（带来源标注）。
 */
import type { Config } from '../config.ts';
import type { Database } from '../persistence/client.ts';
import { createItem, listItems } from '../repo/items.ts';
import { createProposal, listProposals } from '../repo/proposals.ts';
import { listTagDefinitions } from '../repo/tags.ts';
import { PROFILE_DEFINITION_ID } from '../../src/lib/tags.ts';
import { metaGroups, metaTagGroups } from '../persistence/schema.ts';
import { inArray } from 'drizzle-orm';
import { suggestMetaTags } from './proposer.ts';
import { setCompanionName } from '../repo/users.ts';

const PROFILE_MARKER = 'user_profile';
export const DEFAULT_COMPANION = 'Tau';

/** 用户画像相关组（META_TAG_SYSTEM_V1 §2 种子组；渐进披露甜点区）。 */
const PROFILE_GROUP_KEYS = ['用户画像', '个人经历'];

/** 查找或创建 Meta User Profile 锚点条目（raw.document + fields.profile 标记；幂等）。 */
export async function ensureProfileAnchor(db: Database, userName: string): Promise<string> {
  const all = await listItems(db);
  const existing = all.find((i) => i.source_label === PROFILE_MARKER);
  if (existing) return existing.id;
  const anchor = await createItem(db, {
    type: 'raw.document',
    title: `${userName} 的用户画像`,
    domain: 'user',
    origin: 'user',
    source_label: PROFILE_MARKER,
    fields: { content_text: 'Meta User Profile — 由初始画像管线构建，条目经用户裁决后聚合于此' },
  });
  return anchor.id;
}

/** 用户画像/个人经历两组下的定义（渐进去噪：只建议这两组）。 */
async function profileDefinitions(db: Database): Promise<{ id: string; name: string }[]> {
  const groups = await db
    .select({ groupId: metaGroups.id })
    .from(metaGroups)
    .where(inArray(metaGroups.key, PROFILE_GROUP_KEYS));
  const ids = groups.map((g) => g.groupId);
  const edges = await db
    .select({ definitionId: metaTagGroups.tag_id })
    .from(metaTagGroups)
    .where(inArray(metaTagGroups.group_id, ids));
  if (ids.length === 0 || edges.length === 0) {
    // 兜底锚定：组边未 seed 时至少锚到 User Profile 定义（D-066 画像输出读它）
    return [{ id: PROFILE_DEFINITION_ID, name: 'User Profile' }];
  }
  const wanted = new Set(edges.map((e) => e.definitionId));
  return (await listTagDefinitions(db)).filter((d) => wanted.has(d.id)).map((d) => ({ id: d.id, name: d.name }));
}

export type ProfileInitReport = {
  anchor_id: string;
  proposals: number;
  companion: string;
  llm: 'ok' | 'skipped' | 'absent';
};

/**
 * 初始画像构建：锚点 + 伴灵名 + 用户画像组打标提案（Agent 腿；401 降级不阻塞锚点创建）。
 * sourceItemIds = 屏 1 连接源采集出的 chunks；缺省时用全部非锚点条目。
 */
export async function buildInitialProfile(
  db: Database,
  config: Config | undefined,
  opts: { userId: string; userName: string; sourceItemIds?: string[]; fetchImpl?: import('./llm.ts').FetchLike },
): Promise<ProfileInitReport> {
  const anchorId = await ensureProfileAnchor(db, opts.userName);
  await setCompanionName(db, opts.userId, DEFAULT_COMPANION);

  const report: ProfileInitReport = { anchor_id: anchorId, proposals: 0, companion: DEFAULT_COMPANION, llm: 'absent' };
  if (!config) return report;
  report.llm = 'ok';
  try {
    const profileDefs = await profileDefinitions(db);
    if (profileDefs.length === 0) return report;
    const all = await listItems(db);
    const sources = opts.sourceItemIds?.length
      ? all.filter((i) => opts.sourceItemIds!.includes(i.id) && i.id !== anchorId)
      : all.filter((i) => i.id !== anchorId);
    if (sources.length === 0) return report;
    const suggestions = await suggestMetaTags(
      config,
      sources.slice(0, 12).map((i) => ({ id: i.id, title: i.title, content: String((i.fields as Record<string, unknown>).content_text ?? i.title).slice(0, 200) })),
      profileDefs,
      opts.fetchImpl,
    );
    const pendingRows = await listProposals(db, 'pending');
    const pending = new Set(pendingRows.map((x) => `meta_tag:${x.target_id}:${x.related_definition_id ?? ''}`));
    for (const s of suggestions) {
      const key = `meta_tag:${s.item_id}:${s.definition_id}`;
      if (pending.has(key)) continue;
      await createProposal(db, {
        kind: 'meta_tag',
        target_id: s.item_id,
        related_definition_id: s.definition_id,
        proposed_value: s.value,
        rationale: `profile-init · ${s.why || '初始画像构建'}`,
        source: 'agent',
      });
      report.proposals += 1;
    }
  } catch {
    report.llm = 'skipped'; // 401 等：锚点/伴灵名已落，打标建议降级
  }
  return report;
}

