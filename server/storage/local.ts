import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import type { Config } from '../config.ts';

function safeRef(id: string): string {
  const clean = normalize(id).replace(/^(\.\.[/\\])+/, '').replace(/[/\\]/g, '_');
  return `data/files/${clean}.txt`;
}

export async function storeTextFile(
  config: Config,
  id: string,
  filename: string,
  content: string,
): Promise<{ storage_ref: string; mime_type: string }> {
  const storage_ref = safeRef(id);
  const absolute = join(config.storageDir, `${id}.txt`);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
  return {
    storage_ref,
    mime_type: filename.toLowerCase().endsWith('.md') ? 'text/markdown' : 'text/plain',
  };
}

export function absoluteStoragePath(config: Config, storageRef: string): string {
  return join(config.storageDir, storageRef.split('/').pop() ?? '');
}
