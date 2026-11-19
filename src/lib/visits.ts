/**
 * Client-side visit log (D-040): distinguishes 最近访问 from 最近修改
 * on the Recently page without changing the persistence schema.
 */

const STORAGE_KEY = 'gsc.visits.v1';

type VisitMap = Record<string, string>;

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function readAll(): VisitMap {
  if (!hasStorage()) return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as VisitMap;
  } catch {
    return {};
  }
}

export function recordVisit(id: string): void {
  if (!hasStorage()) return;
  try {
    const all = readAll();
    all[id] = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

export function lastVisited(id: string): string | undefined {
  return readAll()[id];
}

export function visitMap(): VisitMap {
  return readAll();
}
