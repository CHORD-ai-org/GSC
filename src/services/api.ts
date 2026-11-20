import type { EventDTO } from '../lib/events.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { RelationDTO } from '../lib/relations.ts';
import type { ApiError } from '../lib/api.ts';
import type { ContextDTO, ContextDetailDTO } from '../lib/contexts.ts';
import type { ClusterDTO, ClusterDetailDTO } from '../lib/clusters.ts';
import type { ProposalDTO } from '../lib/proposals.ts';
import type { TagDefinitionDTO, TagValueDTO } from '../lib/tags.ts';
import type { SourceDTO, SyncResult } from '../lib/sources.ts';

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
export type UrlIngestResponse = { ok: true; url: string; title: string; text: string };
export type SourceListResponse = { ok: true; sources: SourceDTO[] };
export type SourceDetailResponse = { ok: true; source: SourceDTO };
export type DeleteSourceResponse = { ok: true; deleted: true };
export type SourceSyncResponse = { ok: true; result: SyncResult };
export type AgentSuggestResponse = {
  ok: true;
  suggestions: { index: number; semantic_name: string; classification: string; rationale: string }[];
};
export type AgentDetectResponse = { ok: true; report: { dedupe: number; metadata: number; association: number } };
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
  | UrlIngestResponse
  | SourceListResponse
  | SourceDetailResponse
  | DeleteSourceResponse
  | SourceSyncResponse
  | AgentSuggestResponse
  | AgentDetectResponse
  | UserListResponse
  | ShareListResponse
  | TagDefinitionListResponse
  | TagDefinitionResponse
  | TagValueListResponse
  | TagValueResponse
  | ProfileResponse
  | LlmConfigResponse
  | LlmCheckResponse
  | { ok: true; deleted: true }
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

export function deleteContext(id: string): Promise<{ ok: true; deleted: true }> {
  return request<{ ok: true; deleted: true }>(`/api/contexts/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

export function ingestUrl(url: string): Promise<UrlIngestResponse> {
  return request<UrlIngestResponse>('/api/ingest/url', { method: 'POST', body: JSON.stringify({ url }) });
}

export function listSources(): Promise<SourceListResponse> {
  return request<SourceListResponse>('/api/sources');
}

export function createSource(body: unknown): Promise<SourceDetailResponse> {
  return request<SourceDetailResponse>('/api/sources', { method: 'POST', body: JSON.stringify(body) });
}

export function updateSource(id: string, body: unknown): Promise<SourceDetailResponse> {
  return request<SourceDetailResponse>(`/api/sources/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteSource(id: string): Promise<DeleteSourceResponse> {
  return request<DeleteSourceResponse>(`/api/sources/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function syncSource(id: string): Promise<SourceSyncResponse> {
  return request<SourceSyncResponse>(`/api/sources/${encodeURIComponent(id)}/sync`, { method: 'POST' });
}

export function proposeSuggestions(chunks: { title: string; content: string }[]): Promise<AgentSuggestResponse> {
  return request<AgentSuggestResponse>('/api/agent/propose', { method: 'POST', body: JSON.stringify({ chunks }) });
}

export function runDetect(): Promise<AgentDetectResponse> {
  return request<AgentDetectResponse>('/api/agent/detect', { method: 'POST' });
}

export type UserDTO = { id: string; name: string; created_at: string };
export type ShareDTO = { cluster_id: string; user_id: string; name: string; role: 'view' | 'add'; created_at: string };
export type UserListResponse = { ok: true; users: UserDTO[] };
export type ShareListResponse = { ok: true; shares: ShareDTO[] };

export function listUsers(): Promise<UserListResponse> {
  return request<UserListResponse>('/api/users');
}

export function listClusterShares(clusterId: string): Promise<ShareListResponse> {
  return request<ShareListResponse>(`/api/clusters/${encodeURIComponent(clusterId)}/shares`);
}

export function shareCluster(clusterId: string, body: { user_id?: string; name?: string; role: 'view' | 'add' }): Promise<ShareListResponse> {
  return request<ShareListResponse>(`/api/clusters/${encodeURIComponent(clusterId)}/shares`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function revokeClusterShare(clusterId: string, userId: string): Promise<{ ok: true; deleted: true }> {
  return request<{ ok: true; deleted: true }>(`/api/clusters/${encodeURIComponent(clusterId)}/shares/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

// PLAN-8: Meta Tags and User Profile (D-064/D-066)
export type TagDefinitionListResponse = { ok: true; definitions: TagDefinitionDTO[] };
export type TagDefinitionResponse = { ok: true; definition: TagDefinitionDTO };
export type TagValueListResponse = { ok: true; values: TagValueDTO[] };
export type TagValueResponse = { ok: true; value: TagValueDTO };
export type ProfileResponse = { ok: true; profile: { value: string; scope: string }[] };

export function listTagDefinitions(): Promise<TagDefinitionListResponse> {
  return request<TagDefinitionListResponse>('/api/tags/definitions');
}

export function createTagDefinition(body: { name: string; description?: string }): Promise<TagDefinitionResponse> {
  return request<TagDefinitionResponse>('/api/tags/definitions', { method: 'POST', body: JSON.stringify(body) });
}

export function listTagValues(filter: { item_id?: string; definition_id?: string; owner_id?: string } = {}): Promise<TagValueListResponse> {
  const params = new URLSearchParams();
  if (filter.item_id) params.set('item_id', filter.item_id);
  if (filter.definition_id) params.set('definition_id', filter.definition_id);
  if (filter.owner_id) params.set('owner_id', filter.owner_id);
  const qs = params.toString();
  return request<TagValueListResponse>(`/api/tags/values${qs ? `?${qs}` : ''}`);
}

export function createTagValue(body: { definition_id: string; item_id?: string; value: string; scope?: string; confirmed?: boolean }): Promise<TagValueResponse> {
  return request<TagValueResponse>('/api/tags/values', { method: 'POST', body: JSON.stringify(body) });
}

export function setTagValueConfirmed(id: string, confirmed: boolean): Promise<TagValueResponse> {
  return request<TagValueResponse>(`/api/tags/values/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ confirmed }),
  });
}

export function deleteTagValue(id: string): Promise<{ ok: true; deleted: true }> {
  return request<{ ok: true; deleted: true }>(`/api/tags/values/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getProfile(): Promise<ProfileResponse> {
  return request<ProfileResponse>('/api/profile');
}

// Settings UI: runtime LLM provider configuration (the key is write-only)
export type LlmPublicConfig = { base_url: string; model: string; key_set: boolean; key_hint: string };
export type LlmConfigResponse = { ok: true; config: LlmPublicConfig };
export type LlmCheckResponse = { ok: true; model: string; ms: number; reply: string };

export function getLlmConfig(): Promise<LlmConfigResponse> {
  return request<LlmConfigResponse>('/api/llm/config');
}

export function updateLlmConfig(body: { base_url?: string; model?: string; api_key?: string }): Promise<LlmConfigResponse> {
  return request<LlmConfigResponse>('/api/llm/config', { method: 'PATCH', body: JSON.stringify(body) });
}

export function checkLlm(): Promise<LlmCheckResponse> {
  return request<LlmCheckResponse>('/api/llm/check', { method: 'POST' });
}
