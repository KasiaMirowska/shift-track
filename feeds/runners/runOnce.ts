import { closeDb } from "drizzle/db";
import { adapters } from "feeds/adapters";
import persistMatchedArticles from "feeds/persistData/persistMatchedArticles";
import runHydratorOnce from "feeds/workers/runHydratorOnce";
import { setGlobalDispatcher, Agent } from "undici";

const httpAgent = new Agent({
  keepAliveTimeout: 10_000, // 10s
  keepAliveMaxTimeout: 15_000, // 15s
  pipelining: 1,
});
setGlobalDispatcher(httpAgent);

export async function runAllAdaptersOnce() {
  try {
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
          await runHydratorOnce(res.hydrateTargets, 15);
        }
      } catch (e: any) {
        console.error(`[${adapter.id}] ERROR`, e?.message ?? e);
      }
    }
  } finally {
    await closeDb();
    await httpAgent.close(); // close once after the loop
  }
}
