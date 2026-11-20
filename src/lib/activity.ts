/** Activity buckets for the density map (D-056). Pure — day grouping over items + proposals. */

export type DayCell = {
  day: string; // YYYY-MM-DD
  created: number;
  updated: number;
  pending: number;
  total: number;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function buildActivityDays(
  items: { created_at: string; updated_at: string }[],
  proposals: { created_at: string }[],
  now: Date = new Date(),
  weeks = 12,
): DayCell[] {
  const days = new Map<string, DayCell>();
  const start = new Date(now);
  start.setDate(start.getDate() - weeks * 7 + 1);
  const startKey = dayKey(start.toISOString());
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d.toISOString());
    days.set(key, { day: key, created: 0, updated: 0, pending: 0, total: 0 });
  }
  for (const item of items) {
    const c = days.get(dayKey(item.created_at));
    if (c) { c.created += 1; c.total += 1; }
    const u = days.get(dayKey(item.updated_at));
    if (u && dayKey(item.updated_at) !== dayKey(item.created_at)) { u.updated += 1; u.total += 1; }
  }
  for (const p of proposals) {
    const cell = days.get(dayKey(p.created_at));
    if (cell) { cell.pending += 1; cell.total += 1; }
  }
  return [...days.values()].filter((c) => c.day >= startKey);
}
