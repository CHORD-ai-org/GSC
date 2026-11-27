/**
 * OVERVIEW_REDESIGN OV-BE：Overview 页两个只读聚合（无新表/无 JSONB，现算）。
 * - overviewStats：近 7 日 events 按日计数 + 今日新增 items/proposals（数据卡真源）
 * - overviewFeed：events+proposals 合流倒序活动流（叙事动词映射在前端模板层）
 */
import { desc, eq, gte } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { events, items, proposals } from '../persistence/schema.ts';

export type OverviewStats = {
  days: { date: string; count: number }[]; // 近 7 日，升序（昨天→今天）
  today_items: number;
  today_proposals: number;
};

export type OverviewFeedEntry = {
  at: string;
  actor: string;
  kind: 'event' | 'proposal';
  verb: string;
  target_title: string;
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function overviewStats(db: Database): Promise<OverviewStats> {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 86400_000);
  const evRows = await db.select({ at: events.at }).from(events).where(gte(events.at, since));
  const counts = new Map<string, number>();
  for (const r of evRows) {
    const k = dayKey(r.at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 86400_000);
    const k = dayKey(d);
    days.push({ date: k, count: counts.get(k) ?? 0 });
  }
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemRows = await db.select({ id: items.id }).from(items).where(gte(items.created_at, today0));
  const propRows = await db.select({ id: proposals.id }).from(proposals).where(gte(proposals.created_at, today0));
  return { days, today_items: itemRows.length, today_proposals: propRows.length };
}

export async function overviewFeed(db: Database, limit = 12): Promise<OverviewFeedEntry[]> {
  const evRows = await db
    .select({ at: events.at, actor: events.actor, verb: events.action, title: items.title })
    .from(events)
    .innerJoin(items, eq(events.item_id, items.id))
    .orderBy(desc(events.at))
    .limit(limit);
  const propRows = await db
    .select({ at: proposals.created_at, kind: proposals.kind, title: items.title, source: proposals.source })
    .from(proposals)
    .leftJoin(items, eq(proposals.target_id, items.id))
    .orderBy(desc(proposals.created_at))
    .limit(limit);
  const merged: OverviewFeedEntry[] = [
    ...evRows.map((r) => ({ at: r.at.toISOString(), actor: r.actor, kind: 'event' as const, verb: r.verb, target_title: r.title })),
    ...propRows.map((r) => ({ at: r.at.toISOString(), actor: r.source, kind: 'proposal' as const, verb: r.kind, target_title: r.title ?? '（已删除条目）' })),
  ];
  return merged.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
