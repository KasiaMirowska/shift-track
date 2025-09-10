import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  subjects,
  subjectWatches,
  subjectFeeds,
  publications,
  sources,
  subjectSources,
  articleTexts,
  opinions,
  ingestionEvents,
  publicationMetrics,
} from "drizzle/schema";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Subject = InferSelectModel<typeof subjects>;
export type NewSubject = InferInsertModel<typeof subjects>;
export type SubjectWatches = InferInsertModel<typeof subjectWatches>;
export type SubjectFeeds = InferInsertModel<typeof subjectFeeds>;
export type Publications = InferInsertModel<typeof publications>;
export type Sources = InferInsertModel<typeof sources>;
export type SubjectSources = InferInsertModel<typeof subjectSources>;
export type ArticleTexts = InferInsertModel<typeof articleTexts>;
export type Opinions = InferInsertModel<typeof opinions>;
export type IngestionEvents = InferInsertModel<typeof ingestionEvents>;
export type PublicationMetrics = InferInsertModel<typeof publicationMetrics>;

export enum SUBJECT_TYPES {
  person = "PERSON",
  organization = "ORGANIZATION",
  policy = "POLICY",
  topic = "TOPIC",
}

export interface SlugParams {
  slug: string;
}

export type CreateSubjectState = { ok: true } | { ok: false; error?: string };

export type NormalizedArticle = {
  url: string;
  title: string;
  published: Date; // <-- matches DB
  publicationSlug?: string | null; // optional FK
  excerpt?: string | null;
  summary?: string | null;
  author?: string | null;
  html?: string | null;
  section?: string | null;
  language?: string | null;
  externalId?: string | null;
  raw?: unknown;
};

export type Candidate = { item: NormalizedArticle; subjectIds: string[] };

export interface NewsSourceAdapter {
  id: string;
  fetchBatch(): Promise<NormalizedArticle[]>;
}

export interface PersistedRecord {
  fetched: number;
  kept: number;
  inserted: number;
  linked: number;
  hydrateTargets: HydratorTarget[];
}

export type FeedSection = "news" | "politics" | "science" | "culture";
export type PubHints = { slug: string; name?: string; domain?: string };

export type HydratorTarget = { id: string; url: string };

type FeedRow = {
  id: string;
  url: string;
  type: "rss" | "atom" | "api" | "scraper";
  adapterKey: string | null;
  section: string | null;
  publicationSlug: string | null;
  paramsJson: string | null;
};

export type DetailLimits = {
  opinionsLimit?: number;
  articlesLimit?: number;
  feedsPerWatchLimit?: number;
};
