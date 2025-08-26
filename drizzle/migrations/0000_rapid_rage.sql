CREATE TYPE "public"."subject_type" AS ENUM('PERSON', 'ORGANIZATION', 'POLICY', 'TOPIC');--> statement-breakpoint
CREATE TABLE "article_texts" (
	"source_id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_url" text NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"duration_ms" integer,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_id" text
);
--> statement-breakpoint
CREATE TABLE "opinions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" text NOT NULL,
	"source_id" text NOT NULL,
	"quote" text NOT NULL,
	"summary" text,
	"sentiment" real NOT NULL,
	"stance" text,
	"said_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publication_metrics_daily" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_id" text NOT NULL,
	"day" timestamp with time zone NOT NULL,
	"avg_sentiment" real NOT NULL,
	"articles_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publications_slug_unique" UNIQUE("slug"),
	CONSTRAINT "publications_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"publication_id" text,
	"published" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"excerpt" text,
	"summary" text,
	"sentiment" real,
	"text_hash" text,
	"word_count" integer,
	CONSTRAINT "sources_url_unique" UNIQUE("url"),
	CONSTRAINT "sources_text_hash_unique" UNIQUE("text_hash")
);
--> statement-breakpoint
CREATE TABLE "subject_feeds" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watch_id" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_sources" (
	"subject_id" text NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_watches" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" text NOT NULL,
	"query" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "subject_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "article_texts" ADD CONSTRAINT "article_texts_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_events" ADD CONSTRAINT "ingestion_events_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_metrics_daily" ADD CONSTRAINT "publication_metrics_daily_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_feeds" ADD CONSTRAINT "subject_feeds_watch_id_subject_watches_id_fk" FOREIGN KEY ("watch_id") REFERENCES "public"."subject_watches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_sources" ADD CONSTRAINT "subject_sources_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_sources" ADD CONSTRAINT "subject_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_watches" ADD CONSTRAINT "subject_watches_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sources" ADD COLUMN "author"   text;
ALTER TABLE "sources" ADD COLUMN "html"     text;
ALTER TABLE "sources" ADD COLUMN "section"  text;
ALTER TABLE "sources" ADD COLUMN "language" text;
ALTER TABLE "subject_sources"
ADD CONSTRAINT "subject_sources_uniq" UNIQUE ("subject_id", "source_id");
CREATE INDEX IF NOT EXISTS "sources_published_idx"     ON "sources" ("published");
CREATE INDEX IF NOT EXISTS "sources_pub_date_idx"      ON "sources" ("publication_id", "published");
CREATE INDEX IF NOT EXISTS "ingestion_events_occurred_idx"    ON "ingestion_events" ("occurred_at");
CREATE INDEX IF NOT EXISTS "ingestion_events_source_url_idx"  ON "ingestion_events" ("source_url");


