// scripts/seedFeedsFromAdapters.ts
import { db } from "../../drizzle/db";
import { feeds, publications } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

// Mirror your configs here for seeding:
const seedConfigs: Array<{
  publicationSlug: "bbc" | "npr" | "guardian";
  section: "top" | "politics" | "science" | "culture";
  type: "rss" | "api";
  url: string; // for Guardian API: the endpoint path you call per section
  adapterKey?: string; // "guardian-api" for api entries
  params?: Record<string, unknown>; // optional
}> = [
  // BBC RSS
  {
    publicationSlug: "bbc",
    section: "top",
    type: "rss",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    publicationSlug: "bbc",
    section: "politics",
    type: "rss",
    url: "https://feeds.bbci.co.uk/news/politics/rss.xml",
  },
  {
    publicationSlug: "bbc",
    section: "science",
    type: "rss",
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
  },
  {
    publicationSlug: "bbc",
    section: "culture",
    type: "rss",
    url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
  },

  // NPR RSS
  {
    publicationSlug: "npr",
    section: "science",
    type: "rss",
    url: "https://feeds.npr.org/1007/rss.xml",
  },
  {
    publicationSlug: "npr",
    section: "culture",
    type: "rss",
    url: "https://feeds.npr.org/1008/rss.xml",
  },

  // Guardian API — store endpoint path per section
  {
    publicationSlug: "guardian",
    section: "top",
    type: "api",
    url: "https://content.guardianapis.com/world",
    adapterKey: "guardian-api",
  },
  {
    publicationSlug: "guardian",
    section: "politics",
    type: "api",
    url: "https://content.guardianapis.com/politics",
    adapterKey: "guardian-api",
  },
  {
    publicationSlug: "guardian",
    section: "science",
    type: "api",
    url: "https://content.guardianapis.com/science",
    adapterKey: "guardian-api",
  },
  {
    publicationSlug: "guardian",
    section: "culture",
    type: "api",
    url: "https://content.guardianapis.com/culture",
    adapterKey: "guardian-api",
  },
];

function normSection(s: string) {
  return s === "top" ? "news" : s;
}

export async function seedFeedsFromAdapters() {
  console.log("RUNNING");
  const slugs = [...new Set(seedConfigs.map((c) => c.publicationSlug))];
  const pubs = await db
    .select({ id: publications.id, slug: publications.slug })
    .from(publications)
    .where(inArray(publications.slug, slugs));

  const pubBySlug = new Map(pubs.map((p) => [p.slug, p.id]));

  for (const c of seedConfigs) {
    const publicationId = pubBySlug.get(c.publicationSlug);
    if (!publicationId) {
      console.warn("Missing publication for slug", c.publicationSlug);
      continue;
    }
    console.log("ABOUT TO INSERT IN DB");
    await db
      .insert(feeds)
      .values({
        publicationId,
        url: c.url,
        type: c.type,
        section: normSection(c.section),
        adapterKey: c.adapterKey ?? (c.type === "api" ? "generic-api" : "rss"),
        paramsJson: c.params ? JSON.stringify(c.params) : null,
        lang: "en",
        region: "US",
        title: `${c.publicationSlug.toUpperCase()} ${normSection(c.section)}`,
      })
      .onConflictDoNothing();
  }
}
