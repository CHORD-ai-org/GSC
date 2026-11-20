import { integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

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

export const schema = { items, itemContent, relations, events, contexts, contextMembers, clusters, clusterMembers, proposals, sources, users, clusterShares, clusterShareEvents, tagDefinitions, tagValues, idempotencyKeys };
