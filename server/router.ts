import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from './config.ts';
import type { Database } from './persistence/client.ts';
import { apiError } from '../src/lib/api.ts';
import {
  validateCreateItemBody,
  validateUpdateItemBody,
} from '../src/lib/items.ts';
import { validateCreateRelationBody } from '../src/lib/relations.ts';
import { readJson, sendApiError, sendJson } from './http.ts';
import { createItem, getItem, listItems, updateItem } from './repo/items.ts';
import { createRelation, listRelations } from './repo/relations.ts';
import { listEvents } from './repo/events.ts';
import { storeTextFile } from './storage/local.ts';

export function createApiRouter(config: Config, db: Database) {
  return async function router(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;

    if (!path.startsWith('/api/')) {
      next();
      return;
    }

    try {
      if (path === '/api/items' && req.method === 'GET') {
        const items = await listItems(db, {
          type: url.searchParams.get('type') ?? undefined,
          domain: url.searchParams.get('domain') ?? undefined,
          q: url.searchParams.get('q') ?? undefined,
        });
        sendJson(res, 200, { ok: true, items });
        return;
      }

      if (path === '/api/items' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateItemBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create item body'));
          return;
        }
        const item = await createItem(db, body, async (id, fields) => {
          if (body.type !== 'raw.filecontent') return fields;
          const stored = await storeTextFile(
            config,
            id,
            fields.filename ?? 'import.txt',
            fields.content_text ?? '',
          );
          return { ...fields, ...stored };
        });
        sendJson(res, 201, { ok: true, item });
        return;
      }

      const detailMatch = path.match(/^\/api\/items\/([^/]+)$/);
      if (detailMatch && req.method === 'GET') {
        const item = await getItem(db, detailMatch[1]);
        if (!item) {
          sendApiError(res, apiError('not_found', 'Item not found'));
          return;
        }
        const [relations, history] = await Promise.all([
          listRelations(db, item.id),
          listEvents(db, item.id),
        ]);
        sendJson(res, 200, { ok: true, item, relations, events: history });
        return;
      }

      if (detailMatch && req.method === 'PATCH') {
        const body = await readJson(req);
        if (!validateUpdateItemBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid update item body'));
          return;
        }
        const item = await updateItem(db, detailMatch[1], body);
        if (!item) {
          sendApiError(res, apiError('not_found', 'Item not found'));
          return;
        }
        sendJson(res, 200, { ok: true, item });
        return;
      }

      if (path === '/api/relations' && req.method === 'POST') {
        const body = await readJson(req);
        if (!validateCreateRelationBody(body)) {
          sendApiError(res, apiError('contract', 'Invalid create relation body'));
          return;
        }
        const result = await createRelation(db, body);
        if (!result.ok) {
          sendApiError(res, apiError(result.reason, result.message));
          return;
        }
        sendJson(res, 201, { ok: true, relation: result.relation });
        return;
      }

      sendJson(res, 404, apiError('not_found', 'Unknown API route'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      sendApiError(res, apiError('internal', message));
    }
  };
}
