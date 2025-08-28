import { db } from "drizzle/db";
import { publications } from "drizzle/schema";
import { inArray } from "drizzle-orm";
import type { PubHints } from "lib/types";

export function derivedPublicationFromUrl(url: string): PubHints | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.endsWith("bbc.co.uk") || host.endsWith("bbc.com")) {
      return { slug: "bbc", name: "BBC News", domain: "bbc.co.uk" };
    }
    if (host.endsWith("npr.org")) {
      return { slug: "npr", name: "NPR", domain: "npr.org" };
    }
    if (host.endsWith("theguardian.com") || host.endsWith("guardian.co.ukc")) {
      return {
        slug: "guardian",
        name: "The Guardian",
        domain: "theguardian.com",
      };
    }
    // Fallback: use registrable domain as slug (last two labels)
    const parts = host.split(".");
    const domain = parts.slice(-2).join(".");
    const slug = domain.split(".")[0];
    return { slug, name: slug[0].toUpperCase() + slug.slice(1), domain };
  } catch (e) {
    console.log("error processing publincation", e);
    return null;
  }
}

function dedupeHints(hints: PubHints[]) {
  const seen = new Set<string>();
  const result: PubHints[] = [];

  for (const h of hints) {
    if (!h) continue; // skip falsy
    if (!seen.has(h.slug)) {
      seen.add(h.slug);
      result.push(h);
    }
  }

  return result;
}

export async function ensurePublicationInDB(
  tx: typeof db,
  hints: PubHints[]
): Promise<Map<string, string>> {
  const wanted = dedupeHints(hints);
  if (wanted.length === 0) return new Map();

  //load existing
  const slugs = wanted.map((w) => w.slug);
  const existing = await tx.query.publications.findMany({
    where: (p, { inArray }) => inArray(p.slug, slugs),
    columns: { id: true, slug: true },
  });
  const existingBySlug = new Map(existing.map((r) => [r.slug, r.id]));

  const missing = wanted.filter((w) => !existingBySlug.has(w.slug));
  let inserted: { id: string; slug: string }[] = [];

  if (missing.length) {
    inserted = await tx
      .insert(publications)
      .values(
        missing.map((m) => ({
          slug: m.slug,
          name: m.name ?? m.slug[0].toUpperCase() + m.slug.slice(1),
          domain: m.domain ?? `${m.slug}.com`,
        }))
      )
      .returning({ id: publications.id, slug: publications.slug });
    console.log("INSERTED NEW PUBS", inserted);
  }

  //merge inserted with existing for final record of publications
  for (const row of inserted) existingBySlug.set(row.slug, row.id);
  return existingBySlug;
}
