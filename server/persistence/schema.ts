import { boolean, doublePrecision, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  domain: text('domain').notNull().default('knowledge'),
  origin: text('origin').notNull().default('user'),
  source_label: text('source_label').notNull().default(''),
  status: text('status').notNull().default('draft'),
  owner_id: text('owner_id').notNull().default('usr_local'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
});

export const itemContent = pgTable('item_content', {
  item_id: text('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  content_text: text('content_text'),
  author: text('author'),
  locator: text('locator'),
  filename: text('filename'),
  storage_ref: text('storage_ref'),
  mime_type: text('mime_type'),
  captured_at: text('captured_at'),
  measured_at: text('measured_at'),
  definition: text('definition'),
  notes: text('notes'),
  claim: text('claim'),
  reasoning: text('reasoning'),
  name: text('name'),
  steps: text('steps'),
  intended_use: text('intended_use'),
  statement: text('statement'),
  alternatives: text('alternatives'),
  consequences: text('consequences'),
  source_item_id: text('source_item_id').references(() => items.id),
});

export const relations = pgTable('relations', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  from_id: text('from_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  to_id: text('to_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  note: text('note').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  created_by: text('created_by').notNull().default('user'),
}, (table) => ({
  edgeUnique: uniqueIndex('relations_edge_unique').on(table.kind, table.from_id, table.to_id),
}));

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  item_id: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  at: timestamp('at', { withTimezone: true }).notNull(),
  actor: text('actor').notNull().default('user'),
  action: text('action').notNull(),
  detail: text('detail').notNull().default(''),
});

export const contexts = pgTable('contexts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  scope: text('scope').notNull(),
  purpose: text('purpose').notNull(),
  owner_id: text('owner_id').notNull().default('usr_local'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const contextMembers = pgTable('context_members', {
  context_id: text('context_id').notNull().references(() => contexts.id, { onDelete: 'cascade' }),
  item_id: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  added_at: timestamp('added_at', { withTimezone: true }).notNull(),
  position: integer('position').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.context_id, table.item_id] }),
}));

export const clusters = pgTable('clusters', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  owner_id: text('owner_id').notNull().default('usr_local'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const clusterMembers = pgTable('cluster_members', {
  cluster_id: text('cluster_id').notNull().references(() => clusters.id, { onDelete: 'cascade' }),
  item_id: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  added_at: timestamp('added_at', { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.cluster_id, table.item_id] }),
}));

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const clusterShares = pgTable('cluster_shares', {
  cluster_id: text('cluster_id').notNull().references(() => clusters.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('view'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.cluster_id, table.user_id] }),
}));

export const clusterShareEvents = pgTable('cluster_share_events', {
  id: text('id').primaryKey(),
  cluster_id: text('cluster_id').notNull().references(() => clusters.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull(),
  role: text('role').notNull(),
  action: text('action').notNull(),
  at: timestamp('at', { withTimezone: true }).notNull(),
});

export const proposals = pgTable('proposals', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  target_id: text('target_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  related_id: text('related_id').references(() => items.id, { onDelete: 'cascade' }),
  /* META_TAG_V1: tag definition id for kind='meta_tag' (related_id is an items FK). */
  related_definition_id: text('related_definition_id'),
  /* SEMANTIC_TITLE_PLAN: outline node path for kind='semantic_name' node titles
     (target_id stays the owning item — items FK). */
  target_path: text('target_path'),
  proposed_value: text('proposed_value').notNull(),
  rationale: text('rationale').notNull().default(''),
  source: text('source').notNull().default('agent'),
  status: text('status').notNull().default('pending'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  resolved_at: timestamp('resolved_at', { withTimezone: true }),
});

export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  label: text('label').notNull(),
  scope: text('scope').notNull().default(''),
  status: text('status').notNull().default('connected'),
  frequency: text('frequency').notNull().default('manual'),
  last_sync_at: timestamp('last_sync_at', { withTimezone: true }),
  last_error: text('last_error').notNull().default(''),
  owner_id: text('owner_id').notNull().default('usr_local'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const tagDefinitions = pgTable('tag_definitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const tagValues = pgTable('tag_values', {
  id: text('id').primaryKey(),
  definition_id: text('definition_id').notNull().references(() => tagDefinitions.id, { onDelete: 'cascade' }),
  item_id: text('item_id').references(() => items.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  scope: text('scope').notNull().default('global'),
  confirmed: integer('confirmed').notNull().default(0),
  owner_id: text('owner_id').notNull().default('usr_local'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});

/* META_TAG_SYSTEM_V1 (0014): groups ←multi-parent→ tags → assignments + typed params. */
export const metaGroups = pgTable('meta_groups', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  visibility_default: text('visibility_default').notNull().default('private'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const metaTagGroups = pgTable('meta_tag_groups', {
  tag_id: text('tag_id').notNull().references(() => tagDefinitions.id, { onDelete: 'cascade' }),
  group_id: text('group_id').notNull().references(() => metaGroups.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
}, (t) => [primaryKey({ columns: [t.tag_id, t.group_id] })]);

export const assignmentParams = pgTable('assignment_params', {
  id: text('id').primaryKey(),
  assignment_id: text('assignment_id').notNull().references(() => tagValues.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  value_type: text('value_type').notNull().default('text'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex('assignment_params_unique').on(t.assignment_id, t.key)]);

export const itemMetaParams = pgTable('item_meta_params', {
  id: text('id').primaryKey(),
  item_id: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  value_type: text('value_type').notNull().default('text'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex('item_meta_params_unique').on(t.item_id, t.key)]);

export const idempotencyKeys = pgTable('idempotency_keys', {
  key: text('key').notNull(),
  endpoint: text('endpoint').notNull(),
  request_hash: text('request_hash').notNull(),
  status: integer('status').notNull(),
  body: text('body').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.key, table.endpoint] }),
}));

export const sourceSnapshots = pgTable('source_snapshots', {
  id: text('id').primaryKey(),
  source_id: text('source_id').references(() => sources.id, { onDelete: 'set null' }),
  external_id: text('external_id').notNull(),
  url: text('url').notNull().default(''),
  canonical_url: text('canonical_url').notNull().default(''),
  title: text('title').notNull().default(''),
  content_text: text('content_text').notNull().default(''),
  author: text('author').notNull().default(''),
  published_at: text('published_at').notNull().default(''),
  site_name: text('site_name').notNull().default(''),
  description: text('description').notNull().default(''),
  content_hash: text('content_hash').notNull().default(''),
  extractor_version: text('extractor_version').notNull().default('1'),
  status: text('status').notNull().default('ok'),
  error: text('error').notNull().default(''),
  retrieved_at: timestamp('retrieved_at', { withTimezone: true }).notNull(),
}, (table) => ({
  identity: uniqueIndex('source_snapshots_identity').on(table.external_id, table.content_hash),
}));

export const captureTasks = pgTable('capture_tasks', {
  id: text('id').primaryKey(),
  source_id: text('source_id'),
  kind: text('kind').notNull().default('web'),
  url: text('url').notNull().default(''),
  status: text('status').notNull().default('pending'),
  stage: text('stage').notNull().default('queued'),
  retry_count: integer('retry_count').notNull().default(0),
  last_error: text('last_error').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
  claimed_at: timestamp('claimed_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
});

/* V4 (M4) kept-tier spatial layout — per-row coordinates (Q-E scratch/kept;
   no JSONB blob, scratch tier stays in localStorage). */
export const spatialLayouts = pgTable('spatial_layouts', {
  item_id: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  page: text('page').notNull(),
  owner_id: text('owner_id').notNull().default('usr_local'),
  x: doublePrecision('x').notNull(),
  y: doublePrecision('y').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.item_id, table.page, table.owner_id] }),
}));

/* SEMANTIC_TITLE_PLAN (batch A): outline nodes L1–L4 — the targets semantic
   titles hang on. Rows are derived from content (ensure re-derives); titles
   carry nameOrigin: rule → agent (proposal accepted) → user (direct edit). */
export const outlineNodes = pgTable('outline_nodes', {
  id: text('id').primaryKey(),
  item_id: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  level: integer('level').notNull(),
  start_offset: integer('start_offset').notNull(),
  end_offset: integer('end_offset').notNull(),
  title: text('title').notNull(),
  name_origin: text('name_origin').notNull().default('rule'),
  /* change detector: agent titles are bound to the text they describe —
     when the slice head changes the title resets to rule (user titles don't). */
  text_head: text('text_head').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  uniq: uniqueIndex('outline_nodes_item_path').on(table.item_id, table.path),
}));

/* LOCAL_SIM (cloud-isomorphic): scheduler registry — folder scans and web crawls
   run on the worker with interval + in-flight lock (idle/running). */
export const schedules = pgTable('schedules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull(), // 'folder' | 'web'
  root_path: text('root_path').notNull().default(''),
  url_list: text('url_list').notNull().default(''), // newline-separated URLs
  interval_min: integer('interval_min').notNull().default(5),
  enabled: boolean('enabled').notNull().default(true),
  status: text('status').notNull().default('idle'), // 'idle' | 'running'
  last_run_at: timestamp('last_run_at', { withTimezone: true }),
  started_at: timestamp('started_at', { withTimezone: true }),
  owner_id: text('owner_id').notNull().default('usr_local'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const schema = { items, itemContent, relations, events, contexts, contextMembers, clusters, clusterMembers, proposals, sources, users, clusterShares, clusterShareEvents, tagDefinitions, tagValues, idempotencyKeys, sourceSnapshots, captureTasks, spatialLayouts, outlineNodes, schedules, metaGroups, metaTagGroups, assignmentParams, itemMetaParams };
