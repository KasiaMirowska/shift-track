import { db } from "drizzle/db";
import { sql } from "drizzle-orm";
import hydrateSource from "./hydrateSource";
import type { HydratorTarget } from "lib/types";

export default async function runHydratorOnce(
  targets: HydratorTarget[],
  fallbackLimit = 15
) {
  let batch = targets;
  console.log("IN HADRATOR.batch", batch);
  if (!batch || !batch.length) {
    console.log("IN HADRATOR.getting batch from db", batch);
    const rows = await db.execute(sql/*sql*/ `
            SELECT s.id , s.url
            FROM sources s
            LEFT JOIN article_texts t ON t.source_id = s.id
            WHERE t.source_id IS NULL
            ORDER BY s.created_at DESC
            LIMIT ${fallbackLimit}`);
    batch = rows?.rows as Array<{ id: string; url: string }>;
  }
  console.log("IN HADRATOR.batch ", batch);
  for (const row of batch) {
    try {
      await hydrateSource(row.id, row.url);
    } catch (e: any) {
      console.error("HydrateOnce failed", row.id, row.url, e?.message ?? e);
    }
  }
}
