import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { sources } from '../persistence/schema.ts';
import type {
  CreateSourceBody,
  SourceDTO,
  SourceFrequency,
  SourceKind,
  SourceStatus,
  UpdateSourceBody,
} from '../../src/lib/sources.ts';

type SourceRow = typeof sources.$inferSelect;

function toDTO(row: SourceRow): SourceDTO {
  return {
    id: row.id,
    kind: row.kind as SourceKind,
    label: row.label,
    scope: row.scope,
    status: row.status as SourceStatus,
    frequency: row.frequency as SourceFrequency,
    last_sync_at: row.last_sync_at ? row.last_sync_at.toISOString() : '',
    last_error: row.last_error,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listSources(db: Database): Promise<SourceDTO[]> {
  const rows = await db.select().from(sources);
  return rows.map(toDTO);
}

export async function getSource(db: Database, id: string): Promise<SourceDTO | undefined> {
  const [row] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return row ? toDTO(row) : undefined;
}

export async function createSource(db: Database, body: CreateSourceBody): Promise<SourceDTO> {
  const id = `src_${randomUUID()}`;
  const now = new Date();
  await db.insert(sources).values({
    id,
    kind: body.kind,
    label: body.label,
    scope: body.scope ?? '',
    status: 'connected',
    frequency: body.frequency ?? 'manual',
    last_sync_at: null,
    last_error: '',
    created_at: now,
    updated_at: now,
  });
  return (await getSource(db, id)) as SourceDTO;
}

export async function updateSource(
  db: Database,
  id: string,
  body: UpdateSourceBody,
): Promise<SourceDTO | undefined> {
  const [current] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (!current) return undefined;
  await db
    .update(sources)
    .set({
      label: body.label ?? current.label,
      scope: body.scope ?? current.scope,
      status: body.status ?? current.status,
      frequency: body.frequency ?? current.frequency,
      updated_at: new Date(),
    })
    .where(eq(sources.id, id));
  return getSource(db, id);
}

export async function deleteSource(db: Database, id: string): Promise<boolean> {
  const [current] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (!current) return false;
  await db.delete(sources).where(eq(sources.id, id));
  return true;
}

export async function markSync(
  db: Database,
  id: string,
  outcome: { ok: true } | { ok: false; message: string },
): Promise<void> {
  const now = new Date();
  if (outcome.ok) {
    await db
      .update(sources)
      .set({ last_sync_at: now, last_error: '', status: 'connected', updated_at: now })
      .where(eq(sources.id, id));
  } else {
    await db
      .update(sources)
      .set({ last_error: outcome.message, status: 'error', updated_at: now })
      .where(eq(sources.id, id));
  }
}
