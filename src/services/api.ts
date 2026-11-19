import type { EventDTO } from '../lib/events.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { RelationDTO } from '../lib/relations.ts';
import type { ApiError } from '../lib/api.ts';
import type { ContextDTO, ContextDetailDTO } from '../lib/contexts.ts';

export type ItemListResponse = { ok: true; items: ItemDTO[] };
export type ItemDetailResponse = {
  ok: true;
  item: ItemDTO;
  relations: { outgoing: RelationDTO[]; incoming: RelationDTO[] };
  events: EventDTO[];
};
export type MutationResponse =
  | { ok: true; item: ItemDTO; relation?: undefined; context?: undefined }
  | { ok: true; relation: RelationDTO; item?: undefined; context?: undefined }
  | { ok: true; context: ContextDTO | ContextDetailDTO; item?: undefined; relation?: undefined };
export type ContextListResponse = { ok: true; contexts: ContextDTO[] };
export type ContextDetailResponse = { ok: true; context: ContextDetailDTO };
export type ApiResponse =
  | ItemListResponse
  | ItemDetailResponse
  | MutationResponse
  | ContextListResponse
  | ContextDetailResponse
  | ApiError;

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
  return request<ItemListResponse>(`/api/items${query}`);
}

export function getItem(id: string): Promise<ItemDetailResponse> {
  return request<ItemDetailResponse>(`/api/items/${encodeURIComponent(id)}`);
}

export function createItem(body: unknown): Promise<MutationResponse> {
  return request<MutationResponse>('/api/items', { method: 'POST', body: JSON.stringify(body) });
}

export function updateItem(id: string, body: unknown): Promise<MutationResponse> {
  return request<MutationResponse>(`/api/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function createRelation(body: unknown): Promise<MutationResponse> {
  return request<MutationResponse>('/api/relations', { method: 'POST', body: JSON.stringify(body) });
}

export function listContexts(): Promise<ContextListResponse> {
  return request<ContextListResponse>('/api/contexts');
}

export function getContext(id: string): Promise<ContextDetailResponse> {
  return request<ContextDetailResponse>(`/api/contexts/${encodeURIComponent(id)}`);
}

export function createContext(body: unknown): Promise<MutationResponse> {
  return request<MutationResponse>('/api/contexts', { method: 'POST', body: JSON.stringify(body) });
}

export function updateContext(id: string, body: unknown): Promise<MutationResponse> {
  return request<MutationResponse>(`/api/contexts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function addContextMember(id: string, itemId: string): Promise<MutationResponse> {
  return request<MutationResponse>(`/api/contexts/${encodeURIComponent(id)}/members`, {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });
}

export function removeContextMember(id: string, itemId: string): Promise<MutationResponse> {
  return request<MutationResponse>(`/api/contexts/${encodeURIComponent(id)}/members`, {
    method: 'DELETE',
    body: JSON.stringify({ item_id: itemId }),
  });
}
