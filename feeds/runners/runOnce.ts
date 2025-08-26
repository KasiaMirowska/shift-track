import { adapters } from "feeds/adapters";
import persistMatchedArticles from "../persistData/persistMatchedArticles";

export async function runAllAdaptersOnce() {
  for (const adapter of adapters) {
    try {
      const items = await adapter.fetchBatch();
      const res = await persistMatchedArticles(adapter.id, items);
      console.log(
        `[${adapter.id}] fetched=${res.fetched} inserted=${res.inserted}`
      );
    } catch (e: any) {
      console.error(`[${adapter.id}] ERROR`, e?.message ?? e);
    }
  }
}
