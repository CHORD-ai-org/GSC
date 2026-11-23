import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Database } from '../../persistence/client.ts';
import type { Config } from '../../config.ts';
import type { FetchedDoc } from './types.ts';
import { contentHash } from '../extract.ts';
import { upsertSnapshot } from '../../repo/snapshots.ts';
import { processSnapshot } from '../pipeline.ts';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.data', '.workbuddy', '.chrome-shot', 'data']);
const DEFAULT_EXTS = new Set(['.md', '.txt', '.json', '.html']);
const MAX_FILES = 200;

async function walk(root: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return; // unreadable root → treated as empty (logged by caller via counts)
  }
  for (const e of entries) {
    if (out.length >= MAX_FILES) return;
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) await walk(full, out);
    } else if (e.isFile() && DEFAULT_EXTS.has(path.extname(e.name).toLowerCase())) {
      out.push(full);
    }
  }
}

/**
 * LOCAL_SIM folder schedule: scan a registered root READ-ONLY, hash-incremental.
 * Unchanged files are skipped via the snapshot table (externalId = relpath+hash),
 * so rescans are idempotent. New/changed files enter the Light Up pipeline
 * (proposals best-effort, exactly like capture).
 */
export async function runFolderSchedule(
  db: Database,
  config: Config,
  sched: { id: string; root_path: string; owner_id: string },
): Promise<{ scanned: number; imported: number }> {
  const files: string[] = [];
  await walk(sched.root_path, files);
  let imported = 0;
  for (const file of files) {
    let contentText: string;
    try {
      contentText = await readFile(file, 'utf-8');
    } catch {
      continue; // file vanished mid-scan — skip, next run picks it up
    }
    const rel = path.relative(sched.root_path, file);
    const rawHash = contentHash(contentText);
    const doc: FetchedDoc = {
      externalId: `${rel}:${rawHash.slice(0, 12)}`,
      url: file,
      title: path.basename(file, path.extname(file)),
      contentText,
      rawHash,
      metadata: { format: 'text', relpath: rel },
    };
    const snap = await upsertSnapshot(db, null, doc);
    if (!snap.created) continue; // unchanged rescan — idempotent
    await processSnapshot(db, config, doc, { kind: 'folder', ownerId: sched.owner_id });
    imported += 1;
  }
  return { scanned: files.length, imported };
}
