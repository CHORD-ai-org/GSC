/**
 * GitHub source adapter (D-051): token + `owner/repo` label, pulls issues
 * as raw items with `source_label` `sync:github:owner/repo#n` provenance.
 * Fetch is injectable for tests; this environment has no external network.
 */
import type { Database } from '../persistence/client.ts';
import { items } from '../persistence/schema.ts';
import { eq } from 'drizzle-orm';
import { createItem } from '../repo/items.ts';
import type { SourceDTO } from '../../src/lib/sources.ts';
import type { SyncResult } from '../../src/lib/sources.ts';

export type GithubIssue = {
  number: number;
  title: string;
  body: string | null;
  user: { login: string } | null;
  html_url: string;
  state: string;
  updated_at: string;
};

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

async function itemExistsBySourceLabel(db: Database, label: string): Promise<boolean> {
  const rows = await db.select({ id: items.id }).from(items).where(eq(items.source_label, label)).limit(1);
  return rows.length > 0;
}

export async function fetchGithubIssues(
  token: string,
  label: string,
  fetchImpl: FetchLike = fetch,
): Promise<GithubIssue[]> {
  const [owner, repo] = label.split('/');
  if (!owner || !repo) throw new Error('GitHub label must be owner/repo');
  const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50`, {
    headers: {
      accept: 'application/vnd.github+json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'user-agent': 'gsc-sync',
    },
  });
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
  return (await res.json()) as GithubIssue[];
}

export async function runGithubSync(
  db: Database,
  source: SourceDTO,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<SyncResult> {
  const issues = await fetchGithubIssues(token, source.label, fetchImpl);
  let imported = 0;
  let skipped = 0;
  for (const issue of issues) {
    const ref = `sync:github:${source.label}#${issue.number}`;
    if (await itemExistsBySourceLabel(db, ref)) {
      skipped += 1;
      continue;
    }
    await createItem(db, {
      type: 'raw.document',
      title: issue.title,
      domain: 'knowledge',
      origin: 'import',
      source_label: ref,
      fields: {
        content_text: issue.body ?? '',
      },
    });
    imported += 1;
  }
  return { imported, skipped };
}
