#!/usr/bin/env bash
set -euo pipefail

# === EDIT THESE ===
OWNER="KasiaMirowska"
REPO="shift-track"     # your repository name
# ==================

repo="$OWNER/$REPO"
echo "➡️  Target repo: $repo"

# 1) Ensure labels exist (idempotent)
mklabel () {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --repo "$repo" --color "$color" --description "$desc" 2>/dev/null || echo "ℹ️  label '$name' exists"
}
mklabel "external-api" "0052cc" "3rd-party integrations"
mklabel "backend"      "1d76db" "Server, DB, APIs"
mklabel "frontend"     "0e8a16" "UI, pages, components"
mklabel "feature"      "5319e7" "New feature work"
mklabel "nlp"          "d93f0b" "Sentiment & text processing"
mklabel "testing"      "0366d6" "Tests and test infra"
mklabel "infra"        "6f42c1" "Tooling, deploy, config"
mklabel "export"       "c2e0c6" "Data exports"
mklabel "automation"   "fbca04" "Scheduled jobs, cron"
mklabel "seo"          "bfdadc" "Metadata, indexing, share"
mklabel "P3"           "dbab09" "Lower priority / later"

# 2) Create (or reuse) the Enhancements milestone
gh api -X POST "repos/$repo/milestones" \
  -f title="Enhancements" \
  -f description="Nice-to-haves after MVP" >/dev/null 2>&1 || true
echo "🧭 Milestone: Enhancements"

# 3) Helper to create an issue in that milestone
mkissue () {
  local title="$1"; shift
  local body="$1"; shift
  local labels="$1"; shift
  gh issue create --repo "$repo" --title "$title" --body "$body" --label "$labels" --milestone "Enhancements" >/dev/null
  echo "✅ $title"
}

# ================= Nice-to-haves =================
mkissue "Add second data source (Reddit or HN)" $'**AC**\n- New adapter (e.g., Reddit or HN) with fetchRecent(topic)\n- Normalize fields to existing schema\n- Merge & dedupe across sources\n- Source filter toggle in UI' "external-api,backend,feature,P3"

mkissue "Compare view: /compare?topics=a,b" $'**AC**\n- Dual-line trend chart and side-by-side stats\n- Query param parsing & validation\n- Empty state when a topic lacks data' "frontend,feature,P3"

mkissue "CSV export: aggregates & articles" $'**AC**\n- /api/export?topic=...&type=aggregates|articles\n- Proper CSV headers; works in Excel/Numbers\n- Basic auth/guard or rate limit if public' "export,backend,feature,P3"

mkissue "Cron-based ingestion (Vercel Cron)" $'**AC**\n- Scheduled ingest for featured topics every 30–60 min\n- Logs confirm runs; failures alerted in logs\n- Idempotent (safe if called repeatedly)' "automation,infra,backend,P3"

mkissue "AI-written weekly summary (toggle)" $'**AC**\n- Route handler generates summary from aggregates + snippets\n- Cache output; fallback to rule-based summary\n- UI toggle: \"AI summary (beta)\"' "nlp,feature,frontend,P3"

mkissue "Basic test coverage" $'**AC**\n- Unit tests for source normalizer & sentiment function\n- One Playwright E2E: /t/[slug] renders chart/list\n- Add to CI workflow' "testing,infra,P3"

# (Optional) Real-time + On-demand ISR if not already planned:
mkissue "Real-time updates via Pusher/Ably" $'**AC**\n- Server publishes topic-updated event after ingest\n- Client subscribes to topic channel and revalidates cache\n- Do NOT send heavy payloads; client refetches' "feature,frontend,backend,P3"

mkissue "On-demand ISR: revalidateTag after ingest" $'**AC**\n- Tag server fetches with next:{ tags: [\"topic:<id>\"] }\n- Call revalidateTag(\"topic:<id>\") at end of ingest\n- Page updates immediately without waiting interval' "seo,infra,backend,P3"

echo "🎉 Done. Nice-to-haves created under the 'Enhancements' milestone in $repo"

# ------- OPTIONAL: auto-add issues to a Project board -------
# If you have a user/org Project and want to auto-add, set these and uncomment:
#   OWNER_OR_ORG="YOUR_GITHUB_USERNAME"
#   PROJECT_NUMBER=1   # find via: gh project list --owner YOUR_GITHUB_USERNAME
# Then for each created issue number, run:
# gh project item-add --owner "$OWNER_OR_ORG" --number "$PROJECT_NUMBER" --url "https://github.com/$repo/issues/<NUMBER>"
