/**
 * U1 client data layer — the seam behind two pieces of knowledge that used to
 * be hand-copied into 25 mutation call sites in App.tsx:
 *
 * 1. "what to refetch after a write" (INVALIDATION). Before this table each
 *    mutation picked its own refetches and deleteSelected forgot the cluster
 *    index, leaving stale member counts on screen.
 * 2. "how a failed mutation reaches the user" (createMutationRunner +
 *    errorMessageKey). Before this, every call site flattened the server's
 *    error kind into a raw string that leaked words like `contract: ...`.
 *
 * Pure module — no DOM, no fetch. The runner takes its side effects as hooks,
 * so the orchestration itself is testable through this small interface.
 */

export type DataKey =
  | 'items'
  | 'detail'
  | 'contexts'
  | 'clusters'
  | 'sources'
  | 'proposals'
  | 'tags'
  | 'shares';

/** Write → refetch rules. Single source of truth; tests pin the load-bearing rows. */
export const INVALIDATION: Record<string, readonly DataKey[]> = {
  'item.create': ['items'],
  'item.update': ['items', 'detail'],
  // Regression pin (U1): deleting an item must refresh clusters and contexts —
  // membership badges live there and used to go stale. No 'detail': the caller
  // clears the selection instead of re-fetching a 404.
  'item.delete': ['items', 'contexts', 'clusters'],
  'item.restore': ['items', 'contexts', 'clusters'],
  'relation.create': ['items', 'detail'],
  'context.create': ['contexts'],
  'context.update': ['contexts'],
  'context.delete': ['contexts'],
  'context.members': ['contexts'],
  'cluster.create': ['clusters'],
  'cluster.update': ['clusters'],
  'cluster.delete': ['clusters'],
  'cluster.members': ['clusters'],
  'proposal.resolve': ['proposals', 'items', 'clusters'],
  'proposal.detect': ['proposals'],
  'source.create': ['sources'],
  'source.update': ['sources'],
  'source.delete': ['sources'],
  'source.sync': ['sources', 'items'],
  'tag.value.create': ['tags'],
  'tag.value.update': ['tags'],
  'tag.value.delete': ['tags'],
  'tag.def.create': ['tags'],
  'share.create': ['shares'],
  'share.revoke': ['shares'],
  // Light Up batch persist: items + the tag values attached to them.
  'lightup.persist': ['items', 'tags'],
};

export function keysAfter(mutation: string): readonly DataKey[] {
  return INVALIDATION[mutation] ?? [];
}

/** Server error kinds → i18n keys. Unknown kinds fall back to the raw message. */
const ERROR_KEYS: Record<string, string> = {
  contract: 'error.contract',
  unauthorized: 'error.unauthorized',
  forbidden: 'error.forbidden',
  not_found: 'error.not_found',
  conflict: 'error.conflict',
  duplicate: 'error.duplicate',
  payload_too_large: 'error.tooLarge',
  rate_limited: 'error.rateLimited',
  db_unavailable: 'error.internal',
  internal: 'error.internal',
};

export function errorMessageKey(e: unknown): string | undefined {
  if (e instanceof Error && 'kind' in e) {
    return ERROR_KEYS[String((e as { kind: unknown }).kind)];
  }
  return undefined;
}

export type MutationRunner = <T>(name: string, fn: () => Promise<T>) => Promise<T | undefined>;

/**
 * One mutation wrapper: clear the scope's error, run the write, refetch per
 * the rules table, and on failure route a human-readable message to the
 * scope the user is actually looking at (errors no longer stomp each other
 * across pages).
 */
export function createMutationRunner(hooks: {
  scope: () => string;
  clearError: (scope: string) => void;
  showError: (scope: string, message: string) => void;
  reload: (keys: readonly DataKey[]) => Promise<void>;
  describeError: (e: unknown) => string;
}): MutationRunner {
  return async function runMutation<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
    const scope = hooks.scope();
    hooks.clearError(scope);
    try {
      const result = await fn();
      await hooks.reload(keysAfter(name));
      return result;
    } catch (e) {
      hooks.showError(scope, hooks.describeError(e));
      return undefined;
    }
  };
}
