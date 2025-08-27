import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  unique,
  index,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

//---------- ENUMS ----------
export const subjectTypeEnum = pgEnum("subject_type", [
  "PERSON",
  "ORGANIZATION",
  "POLICY",
  "TOPIC",
]);

// ---------- TABLES ----------
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const subjects = pgTable(
  "subjects",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    type: subjectTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    nameTypeUnique: unique("name_type").on(t.name, t.type),
  })
);

export const subjectWatches = pgTable(
  "subject_watches",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    indexes: () => [index("subject_watches_subject_idx").on(t.subjectId)],
  })
);

export const subjectFeeds = pgTable(
  "subject_feeds",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    watchId: text("watch_id")
      .notNull()
      .references(() => subjectWatches.id),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uniques: () => [unique("subject_feeds_watch_url").on(t.watchId, t.url)],
  })
);

export const publications = pgTable(
  "publications",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    domain: text("domain").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    indexes: () => [index("publications_name_idx").on(t.name)],
  })
);

export const sources = pgTable(
  "sources",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    url: text("url").notNull(),
    title: text("title").notNull(),
    publicationId: text("publication_id").references(() => publications.id),
    published: timestamp("published", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    excerpt: text("excerpt"),
    summary: text("summary"),
    sentiment: real("sentiment"),
    textHash: text("text_hash"),
    wordCount: integer("word_count"),
    author: text("author"),
    html: text("html"),
    section: text("section"),
    language: text("language"),
  },
  (t) => ({
    urlUnique: uniqueIndex("sources_url_unique").on(t.url),
    textHashUnique: uniqueIndex("sources_text_hash_unique").on(t.textHash),
  })
);

export const subjectSources = pgTable(
  "subject_sources",
  {
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    // matches your DB-level UNIQUE(subject_id, source_id)
    uniq: uniqueIndex("subject_sources_uniq").on(t.subjectId, t.sourceId),
  })
);

export const articleTexts = pgTable("article_texts", {
  sourceId: text("source_id")
    .primaryKey()
    .references(() => sources.id),
  text: text("text").notNull(),
  html: text("html"),
});

export const opinions = pgTable(
  "opinions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    quote: text("quote").notNull(),
    summary: text("summary"),
    sentiment: real("sentiment").notNull(),
    stance: text("stance"),
    saidAt: timestamp("said_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    indexes: () => [
      index("opinions_subject_idx").on(t.subjectId),
      index("opinions_source_said_idx").on(t.sourceId, t.saidAt),
    ],
  })
);

export const ingestionEvents = pgTable(
  "ingestion_events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    sourceUrl: text("source_url").notNull(),
    status: text("status").notNull(),
    detail: text("detail"),
    sourceId: text("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),

    // Timestamp for the event (you referenced this in your index)
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    // keep the same "indexes: () => []" style you used elsewhere
    indexes: () => [
      index("ingestion_events_occurred_idx").on(t.occurredAt),
      index("ingestion_events_source_url_idx").on(t.sourceUrl),
    ],
  })
);

export const publicationMetrics = pgTable(
  "publication_metrics_daily",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    publicationId: text("publication_id")
      .notNull()
      .references(() => publications.id),
    day: timestamp("day", { withTimezone: true }).notNull(),
    avgSentiment: real("avg_sentiment").notNull(),
    articlesCount: integer("articles_count").notNull(),
  },
  (t) => ({
    uniques: () => [unique("pub_day_unique").on(t.publicationId, t.day)],
    indexes: () => [index("publication_metrics_day_idx").on(t.day)],
  })
);

//__________________________________REFERENCES:
// SUBJECTS
export const subjectsRelations = relations(subjects, ({ many }) => ({
  opinions: many(opinions),
  watches: many(subjectWatches),
  sources: many(subjectSources),
}));

// OPINIONS
export const opinionsRelations = relations(opinions, ({ one }) => ({
  subject: one(subjects, {
    fields: [opinions.subjectId],
    references: [subjects.id],
  }),
}));

// SUBJECT WATCHES
export const subjectWatchesRelations = relations(
  subjectWatches,
  ({ one, many }) => ({
    subject: one(subjects, {
      fields: [subjectWatches.subjectId],
      references: [subjects.id],
    }),
    feeds: many(subjectFeeds),
  })
);

// SUBJECT SOURCES

export const subjectSourcesRelations = relations(subjectSources, ({ one }) => ({
  subject: one(subjects, {
    fields: [subjectSources.subjectId],
    references: [subjects.id],
  }),
  source: one(sources, {
    fields: [subjectSources.sourceId],
    references: [sources.id],
  }),
}));

// SUBJECT FEEDS
export const subjectFeedsRelations = relations(subjectFeeds, ({ one }) => ({
  watch: one(subjectWatches, {
    fields: [subjectFeeds.watchId],
    references: [subjectWatches.id],
  }),
}));

// SOURCES
export const sourcesRelations = relations(sources, ({ one, many }) => ({
  publication: one(publications, {
    fields: [sources.publicationId],
    references: [publications.id],
  }),
  subjectLinks: many(subjectSources),
  articleText: one(articleTexts, {
    fields: [sources.id],
    references: [articleTexts.sourceId],
  }),
  opinions: many(opinions),
}));
