#!/usr/bin/env bash
set -euo pipefail

# === EDIT THESE ===
OWNER="KasiaMirowska"
REPO="shift-track"   # or your opinion-tracker repo name
# ==================

repo="$OWNER/$REPO"

echo "➡️  Target: $repo"

# 1) Labels (idempotent)
mklabel () {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --repo "$repo" --color "$color" --description "$desc" 2>/dev/null || echo "ℹ️  label '$name' exists"
}
mklabel "infra"        "6f42c1" "Tooling, deploy, config"
mklabel "setup"        "c5def5" "Initial project scaffolding"
mklabel "backend"      "1d76db" "Server, DB, APIs"
mklabel "frontend"     "0e8a16" "UI, pages, components"
mklabel "api"          "5319e7" "Route handlers / endpoints"
mklabel "db"           "fbca04" "Schema, migrations, queries"
mklabel "nlp"          "d93f0b" "Sentiment & text processing"
mklabel "seo"          "bfdadc" "Metadata, indexing, share"
mklabel "docs"         "ffffff" "README, diagrams, notes"
mklabel "external-api" "0052cc" "3rd-party integrations"
mklabel "page"         "a2eeef" "User-facing pages"
mklabel "ui"           "d4c5f9" "Visual polish/components"
mklabel "product"      "fef2c0" "Product logic & UX"
mklabel "P1"           "b60205" "Highest priority"
mklabel "P2"           "dbab09" "Medium priority"

# 2) Milestone (create if missing). gh lets us refer by title, so no number lookup needed.
gh api -X POST "repos/$repo/milestones" -f title="MVP" -f description="Opinion Tracker MVP (7–10 days)" >/dev/null 2>&1 || true
echo "🧭 Milestone: MVP"

# 3) Helper to create issues
mkissue () {
  local title="$1"; shift
  local body="$1"; shift
  local labels="$1"; shift
  gh issue create --repo "$repo" --title "$title" --body "$body" --label "$labels" --milestone "MVP" >/dev/null
  echo "✅ $title"
}

# === MVP issues (opinion-tracker Next.js-only) ===
mkissue "Setup Next.js App Router project (opinion-tracker MVP)" $'**AC**\n- Next.js + TS initialized\n- Styling configured (Tailwind or CSS)\n- layout.tsx, globals.css, base nav/footer\n- .env.example with API/DB placeholders' "infra,setup,P1"

mkissue "Add DB + ORM and initial schema" $'**AC**\n- Prisma/Drizzle configured (SQLite local, Postgres placeholder)\n- Models: Topic, Article, Sentiment, DailyAggregate\n- First migration + seed few neutral topics' "backend,db,P1"

mkissue "Implement one news source adapter (Phase 1)" $'**AC**\n- lib/sources/news.ts fetchRecent(topic): NormalizedItem[]\n- Env API key, basic error handling/rate limits\n- Normalized fields: title,url,source,publishedAt,snippet\n- Unit test for mapper' "backend,external-api,P1"

mkissue "Create /api/ingest?topic= route to pull & store articles" $'**AC**\n- Validates topic; upserts Article (dedupe by url)\n- Returns { ok:true, ingested:N }\n- Logs basic metrics' "backend,api,P1"

mkissue "Add sentiment scorer and persist scores" $'**AC**\n- lib/sentiment.ts (npm sentiment/VADER)\n- Normalize to [-1,1]\n- Store Sentiment rows per Article\n- Unit test with deterministic inputs' "backend,nlp,P1"

mkissue "Compute & store DailyAggregate (last 7 days)" $'**AC**\n- recomputeDailyAggregates(topicId)\n- avgScore, posCount, negCount, neuCount per day\n- Idempotent; called post-ingest' "backend,db,P1"

mkissue "Topic dashboard /t/[slug] with ISR" $'**AC**\n- export const revalidate = 300\n- Load last 7 days aggregates + top 10 articles\n- Header w/ avg label, trend chart, article list\n- Graceful empty state' "frontend,page,P1"

mkissue "Trend chart component (Recharts)" $'**AC**\n- Line chart of avgScore over last 7 days\n- Axis labels, tooltip, loading skeleton' "frontend,ui,P2"

mkissue "Top articles list with sentiment badges" $'**AC**\n- Title + source + date + pos/neu/neg badge\n- External links with rel=\"noopener\"\n- Truncated snippet' "frontend,ui,P2"

mkissue "Homepage topic search/selector + manual ingest" $'**AC**\n- Search input + suggested topics\n- Navigate to /t/[slug]\n- Button triggers /api/ingest' "frontend,product,P2"

mkissue "One-paragraph weekly summary (rule-based)" $'**AC**\n- Compute avg & trend vs prior\n- Human-friendly summary on topic header' "frontend,product,P2"

mkissue "SEO metadata + OG image for topics" $'**AC**\n- generateMetadata for /t/[slug]\n- OG image template\n- Sitemap for recent topics' "seo,frontend,P2"

mkissue "Deploy to Vercel with environment variables" $'**AC**\n- Source API key set\n- DB configured (Neon/Supabase/Turso or SQLite)\n- Public URL runs' "infra,P1"

mkissue "README + product overview" $'**AC**\n- Live link, screenshots/GIF\n- Architecture & trade-offs, scaling notes\n- Setup instructions; env var docs' "docs,P1"

echo "🎉 Created MVP issues, labels, and milestone in $repo"
echo "👉 Next: open GitHub → Issues to see them. Create a Project board and add these issues to track progress."
