import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import crypto from "node:crypto";
import { db } from "drizzle/db";
import { articleTexts, sources } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { naiveSentimentWithNegation } from "./naiveSentiment";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";
//stripping the feed of styles
function stripStylesheets(html: string) {
  const noStyleTags = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  const noLinkSheets = noStyleTags.replace(
    /<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi,
    ""
  );
  return noLinkSheets;
}

function toAmpVariant(u: string): string | null {
  try {
    const url = new URL(u);
    // If it already ends with /amp, leave it
    if (url.pathname.endsWith("/amp")) return null;
    // NPR & many publishers serve /amp
    url.pathname = url.pathname.replace(/\/?$/, "/amp");
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchHtmlWithFallback(u: string, ua: string): Promise<string> {
  try {
    const res = await fetch(u, {
      headers: { "User-Agent": ua, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(40_000),
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Fetch ${res.status}`);
    return await res.text();
  } catch (err) {
    // Only retry on timeout or abort
    const isAbort =
      (err as any)?.name === "AbortError" ||
      String(err).toLowerCase().includes("aborted") ||
      String(err).toLowerCase().includes("timeout");
    const amp = isAbort ? toAmpVariant(u) : null;
    if (amp) {
      console.warn("[hydrate] primary fetch timed out; retrying AMP:", amp);
      const res2 = await fetch(amp, {
        headers: { "User-Agent": ua, Accept: "text/html,*/*" },
        signal: AbortSignal.timeout(40_000),
        redirect: "follow",
      });
      if (!res2.ok) throw new Error(`Fetch AMP ${res2.status}`);
      return await res2.text();
    }
    throw err;
  }
}

export default async function hydrateSource(sourceId: string, url: string) {
  console.log("[hydrate] start", sourceId, url);
  const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";

  const rawHtml = await fetchHtmlWithFallback(url, UA);

  const vc = new VirtualConsole();
  // Silence noisy css parse logs (we still get thrown errors which we catch)
  vc.on("jsdomError", () => {
    /* ignore css warnings */
  });

  let doc: JSDOM;
  try {
    doc = new JSDOM(rawHtml, { url, virtualConsole: vc });
  } catch {
    const cleaned = stripStylesheets(rawHtml);
    doc = new JSDOM(cleaned, { url, virtualConsole: vc });
  }

  const reader = new Readability(doc.window.document);
  const parsed = reader.parse();

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

    console.log("HYDRATION SAVED", sourceId, {
      wordCount,
      hasHtml: !!contentHtml,
      byline: !!byline,
    });
  });
}
