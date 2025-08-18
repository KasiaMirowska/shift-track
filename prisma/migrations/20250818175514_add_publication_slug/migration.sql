-- Add slug as NULLable first
ALTER TABLE "Publication" ADD COLUMN "slug" TEXT;

-- Optional: enable unaccent for nicer slugs
-- If this fails in your env, just comment it out and keep the regex-only version below.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Backfill slug from name
UPDATE "Publication"
SET "slug" = regexp_replace(
               regexp_replace(
                 lower(unaccent("name")),
                 '[^a-z0-9]+', '-', 'g'
               ),
               '(^-|-$)', '', 'g'
             )
WHERE "slug" IS NULL;

-- Make it required and unique
ALTER TABLE "Publication" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Publication_slug_key" ON "Publication"("slug");
