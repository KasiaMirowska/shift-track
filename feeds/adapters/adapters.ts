import type {
  FeedSection,
  NewsSourceAdapter,
  NormalizedArticle,
} from "lib/types";
import Parser from "rss-parser";

/**
 * Sections we support:
 *   FeedSection = "news" | "politics" | "science" | "culture"
 * For Guardian API, "news" maps to their "world" endpoint as a reasonable default.
 */

type RssItem = {
  guid?: string;
  link?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  creator?: string;
};

const sectionToNormalized = (s: FeedSection) => s ?? "news";

function hasLinkAndTitle(
  i: RssItem
): i is RssItem & { link: string; title: string } {
  return typeof i.link === "string" && typeof i.title === "string";
}

/* ---------- Generic RSS adapter factory ---------- */

export function makeRssAdapterFactory(opts: {
  publicationSlug: string; // "bbc" | "npr" | "guardian"
  idPrefix: string; // "bbc" | "npr" | "guardian"
  feedUrlFor: (section: FeedSection) => string;
  getAuthor?: (item: RssItem) => string | null;
}) {
  const getAuthor = opts.getAuthor ?? (() => null);

  return function makeAdapter(section: FeedSection): NewsSourceAdapter {
    const FEED_URL = opts.feedUrlFor(section);

    return {
      id: `${opts.idPrefix}-${section}-rss`,
      async fetchBatch(): Promise<NormalizedArticle[]> {
        const parser = new Parser<RssItem>();
        const feed = await parser.parseURL(FEED_URL);

        return (feed.items ?? [])
          .filter(hasLinkAndTitle)
          .map<NormalizedArticle>((i) => ({
            externalId: i.guid || i.link,
            url: i.link,
            title: i.title,
            summary: i.contentSnippet ?? null,
            html: i.content ?? null,
            author: getAuthor(i) ?? i.creator ?? null,
            published: i.isoDate ? new Date(i.isoDate) : new Date(),
            publicationSlug: opts.publicationSlug,
            section: sectionToNormalized(section),
            language: "en",
            raw: i,
          }));
      },
    };
  };
}

/* ---------- Concrete RSS factories ---------- */

export const makeBbcAdapter = makeRssAdapterFactory({
  publicationSlug: "bbc",
  idPrefix: "bbc",
  // NOTE: we now use "news" instead of "top"
  feedUrlFor: (section) =>
    section === "news"
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
    section === "news"
      ? "https://feeds.npr.org/1001/rss.xml"
      : section === "politics"
      ? "https://feeds.npr.org/1014/rss.xml"
      : section === "science"
      ? "https://feeds.npr.org/1007/rss.xml"
      : "https://feeds.npr.org/1008/rss.xml", // culture
});

/* ---------- Guardian API adapter ---------- */

/**
 * Guardian sections we care about, mapped to API paths.
 * We treat our normalized "news" as Guardian "world".
 */
const guardianPath: Record<FeedSection, string> = {
  news: "world",
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
  const path = guardianPath[section]; // maps "news" -> "world", etc.
  const showFields = fields.join(",");

  return {
    id: `guardian-api-${section}`,
    async fetchBatch(): Promise<NormalizedArticle[]> {
      const all: NormalizedArticle[] = [];

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
          const f = r.fields ?? {};
          all.push({
            externalId: r.id,
            url: r.webUrl,
            title: r.webTitle ?? f.headline ?? "Untitled",
            summary: f.trailText ?? null,
            html: f.body ?? null,
            author: f.byline ?? null,
            published: r.webPublicationDate
              ? new Date(r.webPublicationDate)
              : new Date(),
            publicationSlug: "guardian",
            section, // already normalized (news/politics/science/culture)
            language: "en",
            raw: r,
          } as NormalizedArticle);
        }

        const current = data?.response?.currentPage;
        const total = data?.response?.pages;
        if (!current || !total || current >= total) break;
      }

      return all;
    },
  };
}
