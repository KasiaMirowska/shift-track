import { closeDb, db } from "drizzle/db";
import {
  subjectFeeds,
  feeds as feedsTable,
  publications,
} from "drizzle/schema";
import { eq } from "drizzle-orm";

import {
  // DB-driven builder utilities you added in feeds/adapters/index.ts
  buildAdaptersForFeedRows,
  adapterFromFeedRow,
  // legacy static list (kept as fallback)
  adapters as staticAdapters,
  // FeedDbRow type shape
  type FeedDbRow,
} from "feeds/adapters";

import persistMatchedArticles from "feeds/persistData/persistMatchedArticles";
import runHydratorOnce from "feeds/workers/runHydratorOnce";

import { setGlobalDispatcher, Agent } from "undici";

const httpAgent = new Agent({
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 15_000,
  pipelining: 1,
});
setGlobalDispatcher(httpAgent);

/** Query the union of feeds referenced by any enabled subject_feed. */
async function queryActiveFeedRows(): Promise<FeedDbRow[]> {
  // We group by feeds.id to avoid fetching the same feed multiple times
  const rows = await db
    .select({
      id: feedsTable.id,
      url: feedsTable.url,
      type: feedsTable.type, // "rss" | "atom" | "api" | "scraper"
      adapterKey: feedsTable.adapterKey,
      section: feedsTable.section,
      publicationSlug: publications.slug,
      paramsJson: feedsTable.paramsJson,
    })
    .from(subjectFeeds)
    .innerJoin(feedsTable, eq(subjectFeeds.feedId, feedsTable.id))
    .leftJoin(publications, eq(feedsTable.publicationId, publications.id))
    .where(eq(subjectFeeds.enabled, true))
    .groupBy(
      feedsTable.id,
      feedsTable.url,
      feedsTable.type,
      feedsTable.adapterKey,
      feedsTable.section,
      feedsTable.paramsJson,
      publications.slug
    );

  // Drizzle's typed select should already match FeedDbRow; cast to satisfy TS
  return rows as FeedDbRow[];
}

/** DB-driven run: fetch only what users/watchers are subscribed to. */
export async function runAllDbFeedsOnce() {
  console.log("STARTING IN FEEDS ONCE");
  try {
    const rows = await queryActiveFeedRows();

    if (!rows.length) {
      console.log(
        "[ingest] No enabled feeds via subject_feeds. Falling back to static adapters."
      );
      await runStaticAdaptersOnce();
      return;
    }

    const adapters = buildAdaptersForFeedRows(rows);

    for (const adapter of adapters) {
      try {
        const items = await adapter.fetchBatch();
        const res = await persistMatchedArticles(adapter.id, items);

        console.log(
          `[${adapter.id}] fetched=${res.fetched} inserted=${
            res.inserted
          } hydrateTargets=${res.hydrateTargets
            .map((h) => `${h.id} ${h.url}`)
            .join(", ")}`
        );

        if (res.hydrateTargets?.length) {
          // keep your existing hydrator behavior
          await runHydratorOnce(res.hydrateTargets, 15);
        }
      } catch (e: any) {
        console.error(`[${adapter.id}] ERROR`, e?.message ?? e);
      }
    }
  } finally {
    await closeDb();
    await httpAgent.close();
  }
}

/** Legacy static run (uses the hard-coded adapters array). */
export async function runStaticAdaptersOnce() {
  try {
    for (const adapter of staticAdapters) {
      try {
        const items = await adapter.fetchBatch();
        const res = await persistMatchedArticles(adapter.id, items);

        console.log(
          `[${adapter.id}] fetched=${res.fetched} inserted=${
            res.inserted
          } hydrateTargets=${res.hydrateTargets
            .map((h) => `${h.id} ${h.url}`)
            .join(", ")}`
        );

        if (res.hydrateTargets?.length) {
          await runHydratorOnce(res.hydrateTargets, 15);
        }
      } catch (e: any) {
        console.error(`[${adapter.id}] ERROR`, e?.message ?? e);
      }
    }
  } finally {
    await closeDb();
    await httpAgent.close();
  }
}

// Default export = DB-driven (so your existing runner call paths keep working)
export default runAllDbFeedsOnce;
