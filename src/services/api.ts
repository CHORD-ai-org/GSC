import type { EventDTO } from '../lib/events.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { RelationDTO } from '../lib/relations.ts';
import type { ApiError } from '../lib/api.ts';
import type { ContextDTO, ContextDetailDTO } from '../lib/contexts.ts';
import type { ClusterDTO, ClusterDetailDTO } from '../lib/clusters.ts';
import type { ProposalDTO } from '../lib/proposals.ts';

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
export type DeleteItemResponse = { ok: true; deleted: true };
export type ClusterListResponse = { ok: true; clusters: ClusterDTO[] };
export type ClusterDetailResponse = { ok: true; cluster: ClusterDetailDTO };
export type DeleteClusterResponse = { ok: true; deleted: true };
export type ProposalListResponse = { ok: true; proposals: ProposalDTO[] };
export type ProposalDetailResponse = { ok: true; proposal: ProposalDTO };
export type ApiResponse =
  | ItemListResponse
  | ItemDetailResponse
  | MutationResponse
  | ContextListResponse
  | ContextDetailResponse
  | DeleteItemResponse
  | ClusterListResponse
  | ClusterDetailResponse
  | DeleteClusterResponse
  | ProposalListResponse
  | ProposalDetailResponse
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

export function deleteItem(id: string): Promise<DeleteItemResponse> {
  return request<DeleteItemResponse>(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

export function listClusters(): Promise<ClusterListResponse> {
  return request<ClusterListResponse>('/api/clusters');
}

export function getCluster(id: string): Promise<ClusterDetailResponse> {
  return request<ClusterDetailResponse>(`/api/clusters/${encodeURIComponent(id)}`);
}

export function createCluster(body: unknown): Promise<ClusterDetailResponse> {
  return request<ClusterDetailResponse>('/api/clusters', { method: 'POST', body: JSON.stringify(body) });
}

export function updateCluster(id: string, body: unknown): Promise<ClusterDetailResponse> {
  return request<ClusterDetailResponse>(`/api/clusters/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteCluster(id: string): Promise<DeleteClusterResponse> {
  return request<DeleteClusterResponse>(`/api/clusters/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function addClusterMember(id: string, itemId: string): Promise<ClusterDetailResponse> {
  return request<ClusterDetailResponse>(`/api/clusters/${encodeURIComponent(id)}/members`, {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });
}

export function removeClusterMember(id: string, itemId: string): Promise<ClusterDetailResponse> {
  return request<ClusterDetailResponse>(`/api/clusters/${encodeURIComponent(id)}/members`, {
    method: 'DELETE',
    body: JSON.stringify({ item_id: itemId }),
  });
}

export function listProposals(status?: string): Promise<ProposalListResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<ProposalListResponse>(`/api/proposals${query}`);
}

export function createProposal(body: unknown): Promise<ProposalDetailResponse> {
  return request<ProposalDetailResponse>('/api/proposals', { method: 'POST', body: JSON.stringify(body) });
}

export function resolveProposal(id: string, status: 'accepted' | 'rejected'): Promise<ProposalDetailResponse> {
  return request<ProposalDetailResponse>(`/api/proposals/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}
