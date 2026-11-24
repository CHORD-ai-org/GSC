import type { EventDTO } from '../lib/events.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { NewsItem, NewsText } from '../lib/news.ts';
import type { RelationDTO } from '../lib/relations.ts';
import type { ApiError } from '../lib/api.ts';
import type { ContextDTO, ContextDetailDTO } from '../lib/contexts.ts';
import type { ClusterDetailDTO } from '../lib/clusters.ts';
import type { ProposalDTO } from '../lib/proposals.ts';
import type { CreateScheduleBody, ScheduleDTO, UpdateScheduleBody } from '../lib/schedules.ts';
import type { TagDefinitionDTO, TagValueDTO } from '../lib/tags.ts';
import type { SourceDTO, SyncResult } from '../lib/sources.ts';

export type ItemListResponse = {
  ok: true;
  items: ItemDTO[];
  activity?: Record<string, { user: number; agent: number }>;
};

/* LOCAL_SIM: scheduler registry (cloud-isomorphic collection schedules). */
export type ScheduleListResponse = { ok: true; schedules: ScheduleDTO[] };
export type ScheduleDetailResponse = { ok: true; schedule: ScheduleDTO };
export type ScheduleRunResponse = { ok: true; detail: string };
export type ScheduleDeleteResponse = { ok: true; deleted: boolean };
/* META_TAG_SYSTEM_V1 */
export type MetaGroupListResponse = { ok: true; groups: { id: string; key: string; name: string; description: string; visibility_default: string }[] };
export type MetaParamsResponse = { ok: true; params: { key: string; value: string; value_type: string }[] };
export type ItemDetailResponse = {
  ok: true;
  item: ItemDTO;
  relations: { outgoing: RelationDTO[]; incoming: RelationDTO[] };
  events: EventDTO[];
  attribution?: { user_edits: number; agent_edits: number; field_owners: Record<string, 'user' | 'agent'> };
};
export type MutationResponse =
  | { ok: true; item: ItemDTO; relation?: undefined; context?: undefined }
  | { ok: true; relation: RelationDTO; item?: undefined; context?: undefined }
  | { ok: true; context: ContextDTO | ContextDetailDTO; item?: undefined; relation?: undefined };
/* U1: list responses carry member_ids (one batched server query) — the client
   index no longer fans out per-row detail fetches. */
export type ContextListResponse = { ok: true; contexts: ContextDetailDTO[] };
export type ContextDetailResponse = { ok: true; context: ContextDetailDTO };
export type DeleteItemResponse = { ok: true; deleted: true };
export type ClusterListResponse = { ok: true; clusters: ClusterDetailDTO[] };
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
  | EventListResponse
  | RelationListResponse
  | SpatialLayoutResponse
  | MutationResponse
  | ContextListResponse
  | ContextDetailResponse
  | DeleteItemResponse
  | ClusterListResponse
  | ClusterDetailResponse
  | DeleteClusterResponse
  | ProposalListResponse
  | ScheduleListResponse
  | ScheduleDetailResponse
  | ScheduleRunResponse
  | ScheduleDeleteResponse
  | MetaGroupListResponse
  | MetaParamsResponse
  | ProposalDetailResponse
  | UrlIngestResponse
  | SourceListResponse
  | SourceDetailResponse
  | DeleteSourceResponse
  | SourceSyncResponse
  | AgentSuggestResponse
  | AgentDetectResponse
  | TrashResponse
  | RestoreResponse
  | PurgeResponse
  | NewsListResponse
  | NewsOneResponse
  | NewsDeleteResponse
  | SearchResponse
  | ItemPageResponse
  | UserListResponse
  | UserCreateResponse
  | UserDeleteResponse
  | ShareListResponse
  | TagDefinitionListResponse
  | TagDefinitionResponse
  | TagValueListResponse
  | TagValueResponse
  | ProfileResponse
  | LlmConfigResponse
  | LlmCheckResponse
  | LlmUsageResponse
  | CaptureResponse
  | CaptureTaskListResponse
  | TokenListResponse
  | TokenCreateResponse
  | McpMetaResponse
  | OutlineResponse
  | OutlineEnsureResponse
  | SpatialLayoutResponse
  | { ok: true; saved: number }
  | { ok: true; deleted: true }
  | ApiError;

/** Typed API failure (U1): the error kind survives for programmatic handling
 *  without leaking into the user-visible message. */
export class ApiRequestError extends Error {
  readonly kind: string;
  readonly retryable: boolean;

  constructor(kind: string, message: string, retryable = false) {
    super(message);
    this.name = 'ApiRequestError';
    this.kind = kind;
    this.retryable = retryable;
  }
}

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
    if (body.ok === false) {
      throw new ApiRequestError(body.kind, body.message, body.retryable ?? false);
    }
    throw new ApiRequestError('internal', `HTTP ${res.status}`);
  }
  return body as T;
}

export type TrashResponse = { ok: true; items: ItemDTO[] };
export type RestoreResponse = { ok: true; restored: true };
export type PurgeResponse = { ok: true; purged: true };

export function listTrash(): Promise<TrashResponse> {
  return request<TrashResponse>('/api/trash');
}

export function restoreItem(id: string): Promise<RestoreResponse> {
  return request<RestoreResponse>(`/api/items/${encodeURIComponent(id)}/restore`, { method: 'POST' });
}

export function purgeItem(id: string): Promise<PurgeResponse> {
  return request<PurgeResponse>(`/api/items/${encodeURIComponent(id)}/purge`, { method: 'POST' });
}

export type NewsListResponse = { ok: true; news: NewsItem[] };
export type NewsOneResponse = { ok: true; news: NewsItem };
export type NewsDeleteResponse = { ok: true; deleted: true };

export function listNews(): Promise<NewsListResponse> {
  return request<NewsListResponse>('/api/news');
}

export function createNews(input: { title: NewsText; summary: NewsText; published: boolean }): Promise<NewsOneResponse> {
  return request<NewsOneResponse>('/api/news', { method: 'POST', body: JSON.stringify(input) });
}

export function updateNews(id: string, patch: { title?: NewsText; summary?: NewsText; published?: boolean }): Promise<NewsOneResponse> {
  return request<NewsOneResponse>(`/api/news/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteNews(id: string): Promise<NewsDeleteResponse> {
  return request<NewsDeleteResponse>(`/api/news/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export type SearchHit = {
  id: string;
  group: 'items' | 'objects' | 'clusters' | 'contexts';
  kind: string;
  title: string;
  snippet: string;
  updated_at: string;
};
export type SearchResponse = { ok: true; hits: SearchHit[] };

export function search(q: string): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`);
}

export type ItemPageResponse = {
  ok: true;
  items: ItemDTO[];
  next_cursor?: string;
  total: number;
  activity?: Record<string, { user: number; agent: number }>;
};

export function listItemsPage(params: { type?: string; domain?: string; q?: string; cursor?: string; limit?: number; group?: string; tag?: string; metaParams?: Record<string, string> }): Promise<ItemPageResponse> {
  const search = new URLSearchParams();
  if (params.type && params.type !== 'all') search.set('type', params.type);
  if (params.domain && params.domain !== 'all') search.set('domain', params.domain);
  if (params.q) search.set('q', params.q);
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  /* META_TAG_V1 筛选 */
  if (params.group) search.set('group', params.group);
  if (params.tag) search.set('tag', params.tag);
  for (const [k, v] of Object.entries(params.metaParams ?? {})) search.set(`param.${k}`, v);
  const query = search.size ? `?${search.toString()}` : '';
  return request<ItemPageResponse>(`/api/items${query}`);
}

/* Full list: follows next_cursor (T202 server pagination) transparently. */
export async function listItems(params: { type?: string; domain?: string; q?: string; group?: string; tag?: string; metaParams?: Record<string, string> }): Promise<ItemListResponse> {
  const items: ItemDTO[] = [];
  const activity: Record<string, { user: number; agent: number }> = {};
  let cursor: string | undefined;
  for (let i = 0; i < 50; i += 1) {
    // U1: pull the largest page the server allows — refresh() runs after every
    // write and a 50-page round-trip per refresh was pure overhead.
    const page = await listItemsPage({ ...params, cursor, limit: 200 });
    items.push(...page.items);
    if (page.activity) Object.assign(activity, page.activity);
    if (!page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return { ok: true, items, activity };
}

/* V2 (M2) read-only projections: batched event stream + relation edges. */
export type EventListResponse = { ok: true; events: EventDTO[] };
export type RelationListResponse = { ok: true; relations: RelationDTO[] };
/* V4 (M4) kept-tier spatial layout (scratch lives in localStorage). */
export type SpatialLayoutResponse = { ok: true; positions: { item_id: string; x: number; y: number }[] };

export function getSpatialLayout(page: string): Promise<SpatialLayoutResponse> {
  return request(`/api/spatial-layout?page=${encodeURIComponent(page)}`);
}

export function putSpatialLayout(
  page: string,
  items: { item_id: string; x: number; y: number }[],
  replace: boolean,
): Promise<{ ok: true; saved: number }> {
  return request(`/api/spatial-layout?page=${encodeURIComponent(page)}`, {
    method: 'PUT',
    body: JSON.stringify({ items, replace }),
  });
}

export function listEventsFor(
  ids: string[],
  opts: { since?: string; limit?: number } = {},
): Promise<EventListResponse> {
  const search = new URLSearchParams({ item_ids: ids.join(',') });
  if (opts.since) search.set('since', opts.since);
  if (opts.limit) search.set('limit', String(opts.limit));
  return request(`/api/events?${search.toString()}`);
}

export function listRelationsFor(ids: string[]): Promise<RelationListResponse> {
  const search = new URLSearchParams({ item_ids: ids.join(',') });
  return request(`/api/relations?${search.toString()}`);
}

export function getItem(id: string, opts: { trace?: boolean } = {}): Promise<ItemDetailResponse> {
  // `trace: true` records an 'opened' engagement event (the user opened the
  // detail). Plain reads (export, indexing) pass nothing and stay side-effect-free.
  const query = opts.trace ? '?trace=1' : '';
  return request<ItemDetailResponse>(`/api/items/${encodeURIComponent(id)}${query}`);
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

/* LOCAL_SIM: schedules CRUD + run-now. */
export function listSchedules(): Promise<ScheduleListResponse> {
  return request('/api/schedules');
}

export function createSchedule(body: CreateScheduleBody): Promise<ScheduleDetailResponse> {
  return request('/api/schedules', { method: 'POST', body: JSON.stringify(body) });
}

export function updateSchedule(id: string, body: UpdateScheduleBody): Promise<ScheduleDetailResponse> {
  return request(`/api/schedules/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteSchedule(id: string): Promise<ScheduleDeleteResponse> {
  return request(`/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function runSchedule(id: string): Promise<ScheduleRunResponse> {
  return request(`/api/schedules/${encodeURIComponent(id)}/run`, { method: 'POST' });
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
export type UserCreateResponse = { ok: true; user: UserDTO };
export type UserDeleteResponse = { ok: true; deleted: true };
export type ShareListResponse = { ok: true; shares: ShareDTO[] };

export function createUser(name: string): Promise<UserCreateResponse> {
  return request<UserCreateResponse>('/api/users', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function deleteUser(id: string): Promise<UserDeleteResponse> {
  return request<UserDeleteResponse>(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

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

export function createTagDefinition(body: { name: string; description?: string; group_ids?: string[] }): Promise<TagDefinitionResponse> {
  return request<TagDefinitionResponse>('/api/tags/definitions', { method: 'POST', body: JSON.stringify(body) });
}


export function listMetaGroups(): Promise<MetaGroupListResponse> {
  return request<MetaGroupListResponse>('/api/meta/groups');
}

export function setItemMetaParams(itemId: string, params: { key: string; value: string; value_type?: string }[]): Promise<MetaParamsResponse> {
  return request(`/api/items/${encodeURIComponent(itemId)}/meta-params`, { method: 'PUT', body: JSON.stringify({ params }) });
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
export type LlmPublicConfig = { provider: string; base_url: string; model: string; key_set: boolean; key_hint: string; key_status: Record<string, boolean> };
export type LlmConfigResponse = { ok: true; config: LlmPublicConfig };
export type LlmCheckResponse = { ok: true; model: string; ms: number; reply: string };

export function getLlmConfig(): Promise<LlmConfigResponse> {
  return request<LlmConfigResponse>('/api/llm/config');
}

export function updateLlmConfig(body: { provider?: string; base_url?: string; model?: string; api_key?: string }): Promise<LlmConfigResponse> {
  return request<LlmConfigResponse>('/api/llm/config', { method: 'PATCH', body: JSON.stringify(body) });
}

export function checkLlm(): Promise<LlmCheckResponse> {
  return request<LlmCheckResponse>('/api/llm/check', { method: 'POST' });
}

// LLM cost accounting: factual token totals + labelled USD estimate.
export type LlmUsageResponse = {
  ok: true;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    estimated_usd: number;
    price_note: string;
    models: Record<string, { prompt_tokens: number; completion_tokens: number }>;
  };
};

export function getLlmUsage(): Promise<LlmUsageResponse> {
  return request<LlmUsageResponse>('/api/llm/usage');
}

// Web Intelligence MVP: explicit URL capture → task → extract → persist + proposals.
export type CaptureResponse = {
  ok: true;
  task_id: string;
  status: string;
  fetched: number;
  imported: number;
  proposals: number;
};
export function captureUrl(url: string): Promise<CaptureResponse> {
  return request<CaptureResponse>('/api/capture', { method: 'POST', body: JSON.stringify({ url }) });
}

// Capture center: recent capture tasks with real processing stages.
export type CaptureTaskDTO = {
  id: string;
  url: string;
  kind: string;
  status: string;
  stage: string;
  retry_count: number;
  last_error: string;
  created_at: string;
  completed_at: string | null;
};
export type CaptureTaskListResponse = { ok: true; tasks: CaptureTaskDTO[] };

export function listCaptureTasks(): Promise<CaptureTaskListResponse> {
  return request<CaptureTaskListResponse>('/api/capture');
}

// Token / Agent access management (T301): list + create + revoke PAT access.
export type TokenSummary = { id: string; name: string; scope: 'read' | 'rw'; userId: string; created_at: string };
export type TokenListResponse = { ok: true; tokens: TokenSummary[] };
export type TokenCreateResponse = { ok: true; id: string; token: string; name: string; scope: 'read' | 'rw' };

// M-2: MCP onboarding metadata (shared tool registry; no secrets).
export type McpMetaTool = { name: string; description: string; inputSchema: Record<string, unknown>; annotations?: Record<string, boolean> };
export type McpMetaResponse = {
  ok: true;
  server: { name: string; version: string };
  command: string;
  env: { name: string; required: boolean; example: string }[];
  tools: McpMetaTool[];
};

export function getMcpMeta(): Promise<McpMetaResponse> {
  return request<McpMetaResponse>('/api/meta/mcp');
}

// SEMANTIC_TITLE_PLAN: outline nodes + on-demand semantic titles.
export type OutlineNodeDTO = {
  id: string;
  path: string;
  level: number;
  start: number;
  end: number;
  title: string;
  nameOrigin: 'rule' | 'agent' | 'user';
};
export type OutlineResponse = { ok: true; outline: OutlineNodeDTO[]; pending_paths: string[] };
export type OutlineEnsureResponse = { ok: true; outline: OutlineNodeDTO[]; proposed: number; pending_paths: string[] };

export function listOutline(itemId: string): Promise<OutlineResponse> {
  return request(`/api/items/${itemId}/outline`);
}

export function ensureOutlineTitles(itemId: string): Promise<OutlineEnsureResponse> {
  return request(`/api/items/${itemId}/outline/ensure-titles`, { method: 'POST', body: JSON.stringify({}) });
}

export function listTokens(): Promise<TokenListResponse> {
  return request<TokenListResponse>('/api/tokens');
}
export function createToken(name: string, scope: 'read' | 'rw'): Promise<TokenCreateResponse> {
  return request<TokenCreateResponse>('/api/tokens', { method: 'POST', body: JSON.stringify({ name, scope }) });
}
export function revokeToken(id: string): Promise<{ ok: true; deleted: true }> {
  return request<{ ok: true; deleted: true }>(`/api/tokens/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
