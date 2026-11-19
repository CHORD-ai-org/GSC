export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24 && then.toDateString() === now.toDateString()) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days <= 1 && yesterday(then, now)) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function yesterday(then: Date, now: Date): boolean {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return then.toDateString() === y.toDateString();
}

export type TimeGroup = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Earlier';

export function timeGroup(iso: string, now: Date = new Date()): TimeGroup {
  const then = new Date(iso);
  if (then.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (then.toDateString() === y.toDateString()) return 'Yesterday';
  if (now.getTime() - then.getTime() < 7 * 86400000) return 'Previous 7 Days';
  return 'Earlier';
}

export const TIME_GROUPS: TimeGroup[] = ['Today', 'Yesterday', 'Previous 7 Days', 'Earlier'];
