import type { InferSelectModel } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  index
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  email: varchar('email', { length: 64 }).notNull().unique(),
  username: varchar('username', { length: 255 }).unique(), // Now nullable
  firstName: varchar('first_name', { length: 255 }).default(''),
  lastName: varchar('last_name', { length: 255 }).default(''),
  profilePic: varchar('profile_pic', { length: 255 }),
  birthday: varchar('birthday', { length: 10 }), // ISO date string: YYYY-MM-DD
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  // --- NEW COLUMN ---
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  title: text('title').notNull(),
  userId: varchar('userId', { length: 255 }).notNull().references(() => user.id),
  messages: json('messages').notNull(), 
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
  // This supports the "Live Sync" feature.
  // It defaults to `false` for safety, so chats are static by default.
  isLiveSynced: boolean('is_live_synced').notNull().default(false),
},
  (table) => {
  return {
    // Index on the `userId` column. This will dramatically speed up queries
    // that filter chats by user (e.g., `WHERE "userId" = '...'`).
    userIdx: index('user_id_idx').on(table.userId),

    // Index on the `updatedAt` column. This speeds up ordering operations
    // (e.g., `ORDER BY "updatedAt" DESC`).
    updatedAtIdx: index('updated_at_idx').on(table.updatedAt),
  };
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: varchar('userId', { length: 255 })
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

// This table stores the polished, Medium-style articles generated from chats.
export const article = pgTable(
  'Article',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    authorId: varchar('authorId', { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sourceChatId: uuid('sourceChatId')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    content_md: text('content_md').notNull(),
    // Stores the CSS variable for the font, e.g., 'var(--font-inter)'
    fontFamily: text('font_family'), // Nullable, as older articles might not have this set.
    status: varchar('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      // Ensures that a user cannot have two articles with the same slug.
      authorSlugUnique: index('author_slug_unique_idx').on(table.authorId, table.slug),
    };
  },
);

export type Article = InferSelectModel<typeof article>;

// --- NEW TABLE: Snippet ---
// This table stores collections of selected messages for quick sharing.
export const snippet = pgTable(
  'Snippet',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    authorId: varchar('authorId', { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sourceChatId: uuid('sourceChatId')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    // Using jsonb to store an array of message_v2 IDs.
    // jsonb is indexed and more performant for queries than standard json.
    selectedMessageIds: json('selected_message_ids').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      // Speeds up fetching all snippets for a given author.
      authorIdx: index('snippet_author_id_idx').on(table.authorId),
    };
  },
);

export type Snippet = InferSelectModel<typeof snippet>;

// --- RELATIONS DEFINITIONS ---

// A user can have many chats, articles and snippets.
export const userRelations = relations(user, ({ many }) => ({
  chats: many(chat),
  articles: many(article),
  snippets: many(snippet),
}));

// A chat belongs to one user and can have many messages, votes, articles, and snippets.
export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
  messages: many(message), // Assuming we use message_v2
  votes: many(vote),
  articles: many(article), // NEW
  snippets: many(snippet), // NEW
}));

// A message belongs to one chat and can have many votes.
export const messageRelations = relations(message, ({ one, many }) => ({
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
  votes: many(vote),
}));

// A vote belongs to one message and one chat.
export const voteRelations = relations(vote, ({ one }) => ({
  chat: one(chat, {
    fields: [vote.chatId],
    references: [chat.id],
  }),
  message: one(message, {
    fields: [vote.messageId],
    references: [message.id],
  }),
}));

// An article belongs to one author (user) and one source chat.
export const articleRelations = relations(article, ({ one }) => ({
  author: one(user, {
    fields: [article.authorId],
    references: [user.id],
  }),
  sourceChat: one(chat, {
    fields: [article.sourceChatId],
    references: [chat.id],
  }),
}));

// A snippet belongs to one author (user) and one source chat.
export const snippetRelations = relations(snippet, ({ one }) => ({
  author: one(user, {
    fields: [snippet.authorId],
    references: [user.id],
  }),
  sourceChat: one(chat, {
    fields: [snippet.sourceChatId],
    references: [chat.id],
  }),
}));