import type { EventDTO } from '../lib/events.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { RelationDTO } from '../lib/relations.ts';
import type { ApiError } from '../lib/api.ts';

export type ItemListResponse = { ok: true; items: ItemDTO[] };
export type ItemDetailResponse = {
  ok: true;
  item: ItemDTO;
  relations: { outgoing: RelationDTO[]; incoming: RelationDTO[] };
  events: EventDTO[];
};
export type MutationResponse =
  | { ok: true; item: ItemDTO; relation?: undefined }
  | { ok: true; relation: RelationDTO; item?: undefined };
export type ApiResponse = ItemListResponse | ItemDetailResponse | MutationResponse | ApiError;

async function request<T extends ApiResponse>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as ApiResponse;
  if (!res.ok || body.ok === false) {
    throw new Error(body.ok === false ? `${body.kind}: ${body.message}` : `HTTP ${res.status}`);
  }
  return body as T;
}

export function listItems(params: { type?: string; domain?: string; q?: string }): Promise<ItemListResponse> {
  const search = new URLSearchParams();
  if (params.type && params.type !== 'all') search.set('type', params.type);
  if (params.domain && params.domain !== 'all') search.set('domain', params.domain);
  if (params.q) search.set('q', params.q);
  const query = search.size ? `?${search.toString()}` : '';
  return request(`/api/items${query}`) as Promise<ItemListResponse>;
}

export function getItem(id: string): Promise<ItemDetailResponse> {
  return request(`/api/items/${encodeURIComponent(id)}`) as Promise<ItemDetailResponse>;
}

export function createItem(body: unknown): Promise<MutationResponse> {
  return request<MutationResponse>('/api/items', { method: 'POST', body: JSON.stringify(body) });
}

export function updateItem(id: string, body: unknown): Promise<MutationResponse> {
  return request(`/api/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function createRelation(body: unknown): Promise<MutationResponse> {
  return request<MutationResponse>('/api/relations', { method: 'POST', body: JSON.stringify(body) });
}
