import { db } from "../drizzle/db";
import { feeds, feedTags } from "../drizzle/schema";
import { eq, ilike, inArray, sql } from "drizzle-orm";

type FeedSection = "news" | "politics" | "science" | "culture";

function deriveSections(hay: string): FeedSection[] {
  const s = hay.toLowerCase();
  const out = new Set<FeedSection>();
  if (/(politic|election|president|senate|congress|campaign)/.test(s))
    out.add("politics");
  if (/(science|research|study|nasa|physics|biology|ai|ml)/.test(s))
    out.add("science");
  if (/(culture|arts|film|music|book|tv)/.test(s)) out.add("culture");
  // default “news” to always be in play
  out.add("news");
  return [...out];
}

export async function resolveFeedsForWatch(input: {
  subjectName: string;
  query: string;
  limit?: number;
}): Promise<string[]> {
  const limit = input.limit ?? 12;
  const haystack = `${input.subjectName} ${input.query}`.slice(0, 128);
  const sections = deriveSections(haystack);

  // 1) Section-prioritized candidates
  const sectionRows = await db
    .select({ id: feeds.id, score: feeds.qualityScore })
    .from(feeds)
    .where(inArray(feeds.section, sections))
    .orderBy(sql`${feeds.qualityScore} DESC NULLS LAST`)
    .limit(limit);

  // 2) Keyword fallback on title (cheap like/unaccent-ish)
  const like = `%${haystack}%`;
  const kwRows = await db
    .select({ id: feeds.id, score: feeds.qualityScore })
    .from(feeds)
    .where(ilike(feeds.title, like))
    .orderBy(sql`${feeds.qualityScore} DESC NULLS LAST`)
    .limit(limit);

  const seen = new Map<string, number>();
  for (const r of [...sectionRows, ...kwRows]) {
    seen.set(r.id, Math.max(seen.get(r.id) ?? -Infinity, r.score ?? 0));
  }

  // Fallback if empty (shouldn’t happen after seeding)
  if (seen.size === 0) {
    const fallback = await db
      .select({ id: feeds.id })
      .from(feeds)
      .where(eq(feeds.url, "http://feeds.reuters.com/reuters/politicsNews"))
      .limit(1);
    if (fallback[0]?.id) return [fallback[0].id];
  }

  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}
