-- CreateEnum
CREATE TYPE "public"."SubjectType" AS ENUM ('PERSON', 'ORGANIZATION', 'POLICY', 'TOPIC');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."SubjectType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubjectWatch" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubjectFeed" (
    "id" TEXT NOT NULL,
    "watchId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Publication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Source" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publicationId" TEXT,
    "published" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excerpt" TEXT,
    "summary" TEXT,
    "sentiment" DOUBLE PRECISION,
    "textHash" TEXT,
    "wordCount" INTEGER,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubjectSource" (
    "subjectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectSource_pkey" PRIMARY KEY ("subjectId","sourceId")
);

-- CreateTable
CREATE TABLE "public"."ArticleText" (
    "sourceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "ArticleText_pkey" PRIMARY KEY ("sourceId")
);

-- CreateTable
CREATE TABLE "public"."Opinion" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "summary" TEXT,
    "sentiment" DOUBLE PRECISION NOT NULL,
    "stance" TEXT,
    "saidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opinion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IngestionEvent" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "durationMs" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT,

    CONSTRAINT "IngestionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublicationMetricDaily" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "avgSentiment" DOUBLE PRECISION NOT NULL,
    "articlesCount" INTEGER NOT NULL,

    CONSTRAINT "PublicationMetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_type_key" ON "public"."Subject"("name", "type");

-- CreateIndex
CREATE INDEX "SubjectWatch_subjectId_idx" ON "public"."SubjectWatch"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectFeed_watchId_url_key" ON "public"."SubjectFeed"("watchId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_domain_key" ON "public"."Publication"("domain");

-- CreateIndex
CREATE INDEX "Publication_name_idx" ON "public"."Publication"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "public"."Source"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Source_textHash_key" ON "public"."Source"("textHash");

-- CreateIndex
CREATE INDEX "Source_published_idx" ON "public"."Source"("published");

-- CreateIndex
CREATE INDEX "Source_publicationId_published_idx" ON "public"."Source"("publicationId", "published");

-- CreateIndex
CREATE INDEX "SubjectSource_sourceId_idx" ON "public"."SubjectSource"("sourceId");

-- CreateIndex
CREATE INDEX "Opinion_subjectId_idx" ON "public"."Opinion"("subjectId");

-- CreateIndex
CREATE INDEX "Opinion_sourceId_saidAt_idx" ON "public"."Opinion"("sourceId", "saidAt");

-- CreateIndex
CREATE INDEX "IngestionEvent_occurredAt_idx" ON "public"."IngestionEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "IngestionEvent_sourceUrl_idx" ON "public"."IngestionEvent"("sourceUrl");

-- CreateIndex
CREATE INDEX "PublicationMetricDaily_day_idx" ON "public"."PublicationMetricDaily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationMetricDaily_publicationId_day_key" ON "public"."PublicationMetricDaily"("publicationId", "day");

-- AddForeignKey
ALTER TABLE "public"."SubjectWatch" ADD CONSTRAINT "SubjectWatch_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubjectFeed" ADD CONSTRAINT "SubjectFeed_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "public"."SubjectWatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Source" ADD CONSTRAINT "Source_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "public"."Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubjectSource" ADD CONSTRAINT "SubjectSource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubjectSource" ADD CONSTRAINT "SubjectSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleText" ADD CONSTRAINT "ArticleText_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opinion" ADD CONSTRAINT "Opinion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opinion" ADD CONSTRAINT "Opinion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IngestionEvent" ADD CONSTRAINT "IngestionEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicationMetricDaily" ADD CONSTRAINT "PublicationMetricDaily_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "public"."Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
