import { describe, expect, it } from 'vitest';
import { buildActivityDays } from './activity.ts';

describe('activity day buckets', () => {
  it('buckets created, updated and pending proposals per day', () => {
    const now = new Date('2026-11-20T12:00:00Z');
    const cells = buildActivityDays(
      [
        { created_at: '2026-11-20T09:00:00Z', updated_at: '2026-11-20T09:00:00Z' },
        { created_at: '2026-11-19T09:00:00Z', updated_at: '2026-11-20T10:00:00Z' },
      ],
      [{ created_at: '2026-11-20T11:00:00Z' }],
      now,
    );
    const today = cells[cells.length - 1];
    expect(today.day).toBe('2026-11-20');
    expect(today.created).toBe(1);
    expect(today.updated).toBe(1);
    expect(today.pending).toBe(1);
    expect(today.total).toBe(3);
    expect(cells).toHaveLength(84);
  });
});
