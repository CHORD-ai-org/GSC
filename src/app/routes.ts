/**
 * GSC route table (D-078): maps URLs ↔ navigation state.
 *
 * The navigation state that defines "where you are" in GSC is:
 *   view  +  itemId (item detail)  +  contextId  +  clusterId  +  day (recent filter)
 *
 * URL shapes:
 *   /                     → start
 *   /recently?day=YYYY-MM-DD
 *   /raw  |  /raw/:itemId
 *   /objects  |  /objects/:itemId
 *   /clusters  |  /clusters/:clusterId
 *   /contexts  |  /contexts/:contextId
 *   /overview /lightup /sync /settings /docs /user /canvas
 *   anything else         → notFound
 */
import type { ViewId } from './Sidebar.tsx';

export type RouteState = {
  view: ViewId;
  itemId?: string;
  contextId?: string;
  clusterId?: string;
  day?: string;
  /** GSC 对话（G7）：会话 id。 */
  chatId?: string;
  /** True when the URL matches no known route (render a 404). */
  notFound?: boolean;
};

export function parsePath(pathname: string, search = ''): RouteState {
  const seg = pathname.split('/').filter(Boolean);
  const query = new URLSearchParams(search);
  const head = seg[0] ?? '';

  if (!head) return { view: 'start' };
  if (seg.length > 1 && !['raw', 'objects', 'clusters', 'contexts', 'chat'].includes(head)) {
    return { view: 'start', notFound: true };
  }

  switch (head) {
    case 'start':
      return { view: 'start' };
    case 'overview':
      return { view: 'overview' };
    case 'recently':
      return { view: 'recently', day: query.get('day') ?? '' };
    case 'raw':
      return seg[1] ? { view: 'raw', itemId: seg[1] } : { view: 'raw' };
    case 'objects':
      return seg[1] ? { view: 'objects', itemId: seg[1] } : { view: 'objects' };
    case 'clusters':
      return seg[1] ? { view: 'clusters', clusterId: seg[1] } : { view: 'clusters' };
    case 'contexts':
      return seg[1] ? { view: 'contexts', contextId: seg[1] } : { view: 'contexts' };
    case 'lightup':
      return { view: 'lightup' };
    case 'sync':
      return { view: 'sync' };
    case 'settings':
      return { view: 'settings' };
    case 'docs':
      return { view: 'docs' };
    case 'user':
      return { view: 'user' };
    case 'chat':
      return seg[1] ? { view: 'chat', chatId: seg[1] } : { view: 'chat' };
    case 'canvas':
      return { view: 'canvas' };
    default:
      return { view: 'start', notFound: true };
  }
}

export function buildPath(s: RouteState): string {
  switch (s.view) {
    case 'start':
      return '/';
    case 'recently':
      return s.day ? `/recently?day=${encodeURIComponent(s.day)}` : '/recently';
    case 'raw':
      return s.itemId ? `/raw/${encodeURIComponent(s.itemId)}` : '/raw';
    case 'objects':
      return s.itemId ? `/objects/${encodeURIComponent(s.itemId)}` : '/objects';
    case 'clusters':
      return s.clusterId ? `/clusters/${encodeURIComponent(s.clusterId)}` : '/clusters';
    case 'contexts':
      return s.contextId ? `/contexts/${encodeURIComponent(s.contextId)}` : '/contexts';
    case 'chat':
      return s.chatId ? `/chat/${encodeURIComponent(s.chatId)}` : '/chat';
    default:
      return `/${s.view}`;
  }
}

/** Typed route builders (single source of truth for URL construction). */
export const routes = {
  start: (): string => '/',
  overview: (): string => '/overview',
  recently: (day?: string): string => buildPath({ view: 'recently', day }),
  raw: (itemId?: string): string => buildPath({ view: 'raw', itemId }),
  objects: (itemId?: string): string => buildPath({ view: 'objects', itemId }),
  clusters: (clusterId?: string): string => buildPath({ view: 'clusters', clusterId }),
  contexts: (contextId?: string): string => buildPath({ view: 'contexts', contextId }),
  chat: (chatId?: string): string => buildPath({ view: 'chat', chatId }),
  lightup: (): string => '/lightup',
  sync: (): string => '/sync',
  settings: (): string => '/settings',
  docs: (): string => '/docs',
  user: (): string => '/user',
  canvas: (): string => '/canvas',
} as const;
