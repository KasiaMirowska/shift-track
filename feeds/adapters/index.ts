import { logStep } from "feeds/utils/printActiveHandles";
import {
  makeBbcAdapter,
  makeNprAdapter,
  makeGuardianApiAdapter,
} from "./adapters";
import type {
  FeedSection,
  NewsSourceAdapter,
  NormalizedArticle,
} from "lib/types";
import Parser from "rss-parser";

type RssItem = {
  guid?: string;
  link?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
};

const sectionToNormalized = (s: FeedSection) => (s === "top" ? "news" : s);

function hasLinkAndTitle(
  i: RssItem
): i is RssItem & { link: string; title: string } {
  return typeof i.link === "string" && typeof i.title === "string";
}

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
        console.log(" parse start", FEED_URL);
        const feed = await logStep(" parse stop", parser.parseURL(FEED_URL)); // or your fetch+parse
        console.log("[bbc-top] parse done. items=", feed.items?.length);
        // const feed = await parser.parseURL(FEED_URL);
        return (feed.items ?? [])
          .filter(hasLinkAndTitle)
          .map<NormalizedArticle>((i) => ({
            externalId: i.guid || i.link,
            url: i.link,
            title: i.title,
            summary: i.contentSnippet ?? null,
            html: i.content ?? null,
            author: getAuthor(i),
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
const configs: Array<{
  kind: "bbc" | "npr" | "guardian";
  section: FeedSection;
}> = [
  { kind: "bbc", section: "top" },
  { kind: "bbc", section: "politics" },
  { kind: "bbc", section: "science" },
  { kind: "bbc", section: "culture" },
  { kind: "npr", section: "science" },
  { kind: "npr", section: "culture" },
  { kind: "guardian", section: "top" },
  { kind: "guardian", section: "politics" },
  { kind: "guardian", section: "science" },
  { kind: "guardian", section: "culture" },
];

export const adapters: NewsSourceAdapter[] = configs.map((c) => {
  switch (c.kind) {
    case "bbc":
      return makeBbcAdapter(c.section);
    case "guardian":
      return makeGuardianApiAdapter(c.section, {
        apiKey: process.env.GUARDIAN_API_KEY!,
      });
    case "npr":
    default:
      return makeNprAdapter(c.section);
  }
});
