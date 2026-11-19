import { integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  domain: text('domain').notNull().default('knowledge'),
  origin: text('origin').notNull().default('user'),
  source_label: text('source_label').notNull().default(''),
  status: text('status').notNull().default('draft'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
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

export const schema = { items, itemContent, relations, events, contexts, contextMembers };
