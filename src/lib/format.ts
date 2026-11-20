export type FormatLang = 'zh' | 'en';

export function relativeTime(iso: string, lang: FormatLang = 'en', now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const min = Math.round(diffMs / 60000);
  const zh = lang === 'zh';
  if (min < 1) return zh ? '刚刚' : 'just now';
  if (min < 60) return zh ? `${min} 分钟前` : `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24 && then.toDateString() === now.toDateString()) {
    return zh ? `${hours} 小时前` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days <= 1 && yesterday(then, now)) return zh ? '昨天' : 'Yesterday';
  if (days < 7) return zh ? `${days} 天前` : `${days} days ago`;
  return zh
    ? then.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
    : then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const TIME_GROUP_KEYS: Record<TimeGroup, string> = {
  Today: 'time.today',
  Yesterday: 'time.yesterday',
  'Previous 7 Days': 'time.prev7',
  Earlier: 'time.earlier',
};

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
