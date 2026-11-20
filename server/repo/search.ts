import { desc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { items, itemContent, clusters, contexts, tagDefinitions, tagValues } from '../persistence/schema.ts';
import { itemTextForFilter } from '../../src/lib/items.ts';
import { toDTO } from './items.ts';

export type SearchHit = {
  id: string;
  group: 'items' | 'objects' | 'clusters' | 'contexts';
  kind: string;
  title: string;
  snippet: string;
  updated_at: string;
};

function snippetAround(text: string, needle: string, width = 90): string {
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text.slice(0, width);
  const start = Math.max(0, idx - 30);
  return (start > 0 ? '…' : '') + text.slice(start, start + width) + (start + width < text.length ? '…' : '');
}

export async function searchAll(db: Database, q: string, limit = 30): Promise<SearchHit[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];

  const rows = await db.select().from(items).orderBy(desc(items.updated_at)).limit(400);
  const contents = await db.select().from(itemContent);
  const contentById = new Map(contents.map((c) => [c.item_id, c]));
  for (const row of rows) {
    const dto = toDTO(row, contentById.get(row.id));
    const text = itemTextForFilter(dto);
    if (!text.toLowerCase().includes(needle)) continue;
    hits.push({
      id: dto.id,
      group: dto.type.startsWith('object.') ? 'objects' : 'items',
      kind: dto.type,
      title: dto.title,
      snippet: snippetAround(text, needle),
      updated_at: dto.updated_at,
    });
    if (hits.length >= limit) return hits;
  }

  const clusterRows = await db.select().from(clusters).orderBy(desc(clusters.updated_at)).limit(200);
  for (const row of clusterRows) {
    const hay = `${row.title} ${row.description ?? ''}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    hits.push({ id: row.id, group: 'clusters', kind: 'cluster', title: row.title, snippet: snippetAround(row.description ?? row.title, needle), updated_at: row.updated_at.toISOString() });
    if (hits.length >= limit) return hits;
  }

  const contextRows = await db.select().from(contexts).orderBy(desc(contexts.updated_at)).limit(200);
  for (const row of contextRows) {
    const hay = `${row.title} ${row.subject} ${row.scope}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    hits.push({ id: row.id, group: 'contexts', kind: 'context', title: row.title, snippet: snippetAround(`${row.subject} · ${row.scope}`, needle), updated_at: row.updated_at.toISOString() });
    if (hits.length >= limit) return hits;
  }

  /* tag values (dimension + value text) */
  const tagRows = await db
    .select({ value: tagValues.value, defName: tagDefinitions.name, item_id: tagValues.item_id, id: tagValues.id })
    .from(tagValues)
    .leftJoin(tagDefinitions, eq(tagValues.definition_id, tagDefinitions.id))
    .limit(300);
  for (const row of tagRows) {
    const hay = `${row.defName ?? ''} ${row.value}`.toLowerCase();
    if (!hay.includes(needle) || !row.item_id) continue;
    const item = rows.find((r) => r.id === row.item_id);
    if (!item) continue;
    hits.push({ id: item.id, group: 'items', kind: `tag:${row.defName ?? ''}`, title: item.title, snippet: `${row.defName ?? ''} = ${row.value}`, updated_at: item.updated_at.toISOString() });
    if (hits.length >= limit) return hits;
  }

  return hits;
}
