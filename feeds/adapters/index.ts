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

/**
 * Build adapters from DB rows OR use the static list below.
 * This file is "glue": keeps your legacy static adapters AND
 * provides DB-row-based adapter builders without ever using "top".
 */

export type FeedDbRow = {
  id: string;
  url: string;
  type: "rss" | "atom" | "api" | "scraper";
  adapterKey: string | null; // e.g. "guardian-api"
  section: string | null; // may be "top" in legacy data — we normalize below
  publicationSlug: string | null; // "bbc" | "npr" | "guardian" | ...
  paramsJson: string | null; // future: serialized adapter params
};

function normalizeSection(s: string | null | undefined): FeedSection {
  const x = (s ?? "").toLowerCase();
  if (x === "top" || x === "" || x === "news") return "news";
  if (x === "politics" || x === "science" || x === "culture")
    return x as FeedSection;
  return "news";
}

/** Minimal RSS adapter from a single URL (no per-publication config needed). */
export function makeRssUrlAdapter(opts: {
  id: string;
  publicationSlug?: string | null;
  url: string;
  section?: string | null;
}): NewsSourceAdapter {
  const parser = new Parser<any>();
  const section: FeedSection = normalizeSection(opts.section);

  return {
    id: `rss-${opts.id}`,
    async fetchBatch(): Promise<NormalizedArticle[]> {
      const feed = await parser.parseURL(opts.url);
      return (feed.items ?? []).map((i: any) => ({
        externalId: i.guid || i.link,
        url: i.link,
        title: i.title,
        summary: i.contentSnippet ?? null,
        html: i.content ?? null,
        author: i.creator ?? null,
        published: i.isoDate ? new Date(i.isoDate) : new Date(),
        publicationSlug: opts.publicationSlug ?? "unknown",
        section,
        language: "en",
        raw: i,
      }));
    },
  };
}

/** Pick the correct concrete adapter for a DB feed row. */
export function adapterFromFeedRow(row: FeedDbRow): NewsSourceAdapter {
  const isGuardianApi =
    row.adapterKey === "guardian-api" ||
    (row.type === "api" && (row.url ?? "").includes("guardianapis.com"));

  if (isGuardianApi) {
    const section = normalizeSection(row.section); // "news"|"politics"|"science"|"culture"
    const baseOpts: any = row.paramsJson ? JSON.parse(row.paramsJson) : {};
    return makeGuardianApiAdapter(section, {
      apiKey: process.env.GUARDIAN_API_KEY!,
      ...baseOpts,
    });
  }

  // Default: RSS/Atom URL
  return makeRssUrlAdapter({
    id: row.id,
    publicationSlug: row.publicationSlug,
    url: row.url,
    section: row.section,
  });
}

/** Convenience: many rows -> many adapters (deduped by feed id). */
export function buildAdaptersForFeedRows(
  rows: FeedDbRow[]
): NewsSourceAdapter[] {
  const seen = new Set<string>();
  const out: NewsSourceAdapter[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(adapterFromFeedRow(r));
  }
  return out;
}

/* ---------- Legacy static adapters (still useful for local/dev) ---------- */

const configs: Array<{
  kind: "bbc" | "npr" | "guardian";
  section: FeedSection;
}> = [
  { kind: "bbc", section: "news" }, // was "top"
  { kind: "bbc", section: "politics" },
  { kind: "bbc", section: "science" },
  { kind: "bbc", section: "culture" },
  { kind: "npr", section: "science" },
  { kind: "npr", section: "culture" },
  { kind: "guardian", section: "news" }, // was "top"
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
