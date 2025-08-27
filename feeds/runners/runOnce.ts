import { adapters } from "feeds/adapters";
import persistMatchedArticles from "../persistData/persistMatchedArticles";
import runHydratorOnce from "feeds/workers/runHydratorOnce";

export async function runAllAdaptersOnce() {
  for (const adapter of adapters) {
    try {
      const items = await adapter.fetchBatch();
      const res = await persistMatchedArticles(adapter.id, items);
      console.log(
        `[${adapter.id}] fetched=${res.fetched} inserted=${res.inserted} hydrateTargets=${res.hydrateTargets}`
      );
      await runHydratorOnce(res.hydrateTargets, 15); //fill in article_texts
    } catch (e: any) {
      console.error(`[${adapter.id}] ERROR`, e?.message ?? e);
    }
  }
}
