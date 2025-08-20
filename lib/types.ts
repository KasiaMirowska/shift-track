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

// …repeat as needed for other tables

export const SUBJECT_TYPES = [
  "PERSON",
  "ORGANIZATION",
  "POLICY",
  "TOPIC",
] as const;

export interface SlugParams {
  slug: string;
}
