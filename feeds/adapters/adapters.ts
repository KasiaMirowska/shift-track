// adapters/rssAdapters.ts
import type {
  FeedSection,
  NewsSourceAdapter,
  NormalizedArticle,
} from "../../lib/types";
import { makeRssAdapterFactory } from ".";

/* ---------- Concrete RSS factories ---------- */

export const makeBbcAdapter = makeRssAdapterFactory({
  publicationSlug: "bbc",
  idPrefix: "bbc",
  feedUrlFor: (section) =>
    section === "top"
      ? "https://feeds.bbci.co.uk/news/rss.xml"
      : section === "politics"
      ? "https://feeds.bbci.co.uk/news/politics/rss.xml"
      : section === "science"
      ? "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"
      : "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
});

export const makeNprAdapter = makeRssAdapterFactory({
  publicationSlug: "npr",
  idPrefix: "npr",
  feedUrlFor: (section) =>
    section === "top"
      ? "https://feeds.npr.org/1001/rss.xml"
      : section === "politics"
      ? "https://feeds.npr.org/1014/rss.xml"
      : section === "science"
      ? "https://feeds.npr.org/1007/rss.xml"
      : "https://feeds.npr.org/1008/rss.xml",
});

/**
 * Guardian sections we care about, mapped to API paths.
 * (Top → world is a reasonable default for general news.)
 */
const sectionPath: Record<FeedSection, string> = {
  top: "world",
  politics: "politics",
  science: "science",
  culture: "culture",
};

type MakeGuardianApiAdapterOptions = {
  /** Your Guardian API key (required) */
  apiKey: string;
  /** Optional free-text query ("q=" param). E.g. "election OR senate" */
  query?: string;
  /** Page size (max ~50 on free tier). Defaults to 25. */
  pageSize?: number;
  /**
   * Max pages to fetch per call (simple pagination).
   * Set to 1 for a single page (default).
   */
  maxPages?: number;
  /**
   * Additional fields to request via show-fields=...
   * Defaults to: trailText,body,headline,byline,shortUrl.
   */
  fields?: string[];
  /**
   * Optional tag filter (e.g., "type/article" or "tone/news").
   * See Guardian docs for tag syntax.
   */
  tag?: string;
  /**
   * Optional from-date/to-date (YYYY-MM-DD).
   */
  fromDate?: string;
  toDate?: string;
};

export function makeGuardianApiAdapter(
  section: FeedSection,
  opts: MakeGuardianApiAdapterOptions
): NewsSourceAdapter {
  const {
    apiKey,
    query,
    pageSize = 25,
    maxPages = 1,
    fields = ["trailText", "body", "headline", "byline", "shortUrl"],
    tag,
    fromDate,
    toDate,
  } = opts;

  if (!apiKey) {
    throw new Error("Guardian API adapter requires an apiKey");
  }

  const base = "https://content.guardianapis.com";
  const path = sectionPath[section];

  const showFields = fields.join(",");
  const sectionForOutput = section === "top" ? "news" : section; // keep your normalized sections

  return {
    id: `guardian-api-${section}`,
    async fetchBatch(): Promise<NormalizedArticle[]> {
      const all: NormalizedArticle[] = [];

      // Simple bounded pagination loop
      for (let page = 1; page <= Math.max(1, maxPages); page++) {
        const url = new URL(`${base}/${path}`);
        url.searchParams.set("api-key", apiKey);
        url.searchParams.set("show-fields", showFields);
        url.searchParams.set("page-size", String(pageSize));
        url.searchParams.set("page", String(page));
        if (query) url.searchParams.set("q", query);
        if (tag) url.searchParams.set("tag", tag);
        if (fromDate) url.searchParams.set("from-date", fromDate);
        if (toDate) url.searchParams.set("to-date", toDate);

        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) {
          // 429s happen on the free tier — surface a useful error
          const text = await res.text().catch(() => "");
          throw new Error(
            `Guardian API ${section} p${page} failed: ${
              res.status
            } ${text.slice(0, 200)}`
          );
        }

        const data = await res.json();
        const results: any[] = data?.response?.results ?? [];
        for (const r of results) {
          // Map API → NormalizedArticle
          const f = r.fields ?? {};
          all.push({
            externalId: r.id, // e.g. "world/live/2025/aug/25/..."
            url: r.webUrl,
            title: r.webTitle ?? f.headline ?? "Untitled",
            summary: f.trailText ?? null,
            html: f.body ?? null, // be mindful: this is HTML
            author: f.byline ?? null,
            published: r.webPublicationDate
              ? new Date(r.webPublicationDate)
              : new Date(),
            publicationSlug: "guardian",
            section: sectionForOutput,
            language: "en",
            raw: r,
          } as NormalizedArticle);
        }

        // Stop if we've reached the last page
        const current = data?.response?.currentPage;
        const total = data?.response?.pages;
        if (!current || !total || current >= total) break;
      }

      return all;
    },
  };
}
