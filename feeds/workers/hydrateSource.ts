import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import crypto from "node:crypto";
import { db } from "drizzle/db";
import { articleTexts, sources } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { naiveSentimentWithNegation } from "./naiveSentiment";

export default async function hydrateSource(sourceId: string, url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ShiftTrackBot/1.0" },
  });
  if (!res.ok) throw new Error(`Fetch ${res.status}`);

  const html = await res.text();

  const doc = new JSDOM(html, { url });
  const reader = new Readability(doc.window.document);
  const parsed = reader.parse();

  // hydrateSource.ts (core of the update part)
  const text = (parsed?.textContent ?? "").trim();
  if (!text) throw new Error("no text extracted");

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const textHash = crypto.createHash("sha256").update(text).digest("hex");
  const sentiment = naiveSentimentWithNegation(text);
  const byline = parsed?.byline?.trim() || null;
  const contentHtml = parsed?.content || null;

  // make a short excerpt if we don't have one
  const makeExcerpt = (s: string, n = 240) =>
    s.replace(/\s+/g, " ").trim().slice(0, n);

  // fetch existing to avoid overwriting good feed data
  const existing = await db.query.sources.findFirst({
    where: (t, { eq }) => eq(t.id, sourceId),
    columns: { author: true, excerpt: true, title: true },
  });

  await db.transaction(async (tx) => {
    // upsert full content
    await tx
      .insert(articleTexts)
      .values({ sourceId, text, html: contentHtml ?? undefined })
      .onConflictDoUpdate({
        target: articleTexts.sourceId,
        set: { text, ...(contentHtml !== null ? { html: contentHtml } : {}) }, // omit if null
      });

    // prepare updates for sources (avoid null overwrites)
    const updates: Partial<typeof sources.$inferInsert> = {
      wordCount,
      textHash,
      sentiment,
    };
    if (!existing?.author && byline) updates.author = byline;
    if (!existing?.excerpt) updates.excerpt = makeExcerpt(text);

    await tx.update(sources).set(updates).where(eq(sources.id, sourceId));
  });
}
