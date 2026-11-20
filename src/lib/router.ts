/**
 * Zero-dependency client router (commercial-grade). History API based.
 *
 * Features: path + query + hash, `:param` pattern matching, navigate/replace/back,
 * React integration via `useLocation` (useSyncExternalStore), stable snapshots.
 *
 * Scope note (D-078): this module is generic and reusable. GSC's concrete URL ↔
 * view mapping lives in `src/app/routes.ts`. Scroll restoration is deferred
 * (the app scrolls inner containers); see ROUTING_SYSTEM.md.
 */
import { useSyncExternalStore } from 'react';

export type Location = {
  pathname: string;
  search: string;
  hash: string;
  /** Changes on every navigation (push/replace/pop). Useful as an effect key. */
  key: string;
};

export type NavigateOptions = { replace?: boolean; state?: unknown };

type Listener = () => void;
const listeners = new Set<Listener>();

let keySeq = 0;
let current: Location = {
  pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
  search: typeof window !== 'undefined' ? window.location.search : '',
  hash: typeof window !== 'undefined' ? window.location.hash : '',
  key: 'init',
};

function emit(): void {
  for (const listener of listeners) listener();
}

function sync(): void {
  keySeq += 1;
  current = {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    key: `k${keySeq}`,
  };
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', sync);
}

function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Location {
  return current;
}

/** Current location (non-React). */
export function getLocation(): Location {
  return current;
}

/** Navigate to `to` (path + optional search/hash). Pushes a history entry. */
export function navigate(to: string, opts: NavigateOptions = {}): void {
  const url = new URL(to, window.location.origin);
  const target = url.pathname + url.search + url.hash;
  const here = window.location.pathname + window.location.search + window.location.hash;
  if (target === here && !opts.replace) return;
  if (opts.replace) window.history.replaceState(opts.state ?? null, '', target);
  else window.history.pushState(opts.state ?? null, '', target);
  sync();
}

/** Replace the current entry (no new history entry). */
export function replace(to: string, opts: Omit<NavigateOptions, 'replace'> = {}): void {
  navigate(to, { ...opts, replace: true });
}

/** Go back one history entry. */
export function back(): void {
  window.history.back();
}

/** React hook: re-renders on push/replace/popstate. */
export function useLocation(): Location {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Match a `:param` pattern against a pathname.
 * `matchPath('/raw/:id', '/raw/abc')` → `{ id: 'abc' }`; no match → `null`.
 */
export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const a = pathname.split('/').filter(Boolean);
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i += 1) {
    const seg = p[i];
    if (seg.startsWith(':')) {
      params[seg.slice(1)] = decodeURIComponent(a[i]);
    } else if (seg !== a[i]) {
      return null;
    }
  }
  return params;
}

/** Read a query parameter from a location's search string. */
export function queryParam(search: string, name: string): string {
  return new URLSearchParams(search).get(name) ?? '';
}
