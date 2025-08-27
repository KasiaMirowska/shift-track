import { sql } from "drizzle-orm";
import { db } from "drizzle/db";
import { ingestionEvents, sources, subjectSources } from "drizzle/schema";
import { normalizeUrl } from "feeds/persistData/utils/normalizeUrl";
import type {
  Candidate,
  HydratorTarget,
  NormalizedArticle,
  PersistedRecord,
  PubHints,
} from "lib/types";
import {
  derivedPublicationFromUrl,
  ensurePublicationInDB,
} from "./utils/publications";

const squash = (s?: string | null): string =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ");

export default async function persistMatchedArticles(
  adapterId: string,
  items: NormalizedArticle[]
): Promise<PersistedRecord> {
  console.log("[persistMatchedArticles] using file:", __filename);

  if (!items.length)
    return { fetched: 0, kept: 0, inserted: 0, linked: 0, hydrateTargets: [] };

  // 1) Load enabled watches once (OK to do outside tx)
  let watches: {
    subjectId: string;
    query: string;
    enabled: boolean;
  }[] = [];
  try {
    watches = await db.query.subjectWatches.findMany({
      columns: { subjectId: true, query: true, enabled: true },
    });
  } catch (err: any) {
    console.error("[subject_watches] SELECT failed:", err?.code, err?.message);
    throw err;
  }

  const activeWatches = watches
    .filter((w) => w.enabled && (w.query ?? "").trim() !== "")
    .map((w) => ({
      subjectId: w.subjectId,
      query: w.query!.toLowerCase().trim(),
    }));

  // 2) Prematch in memory
  const candidates: Candidate[] = [];
  for (const i of items) {
    const hay = squash(`${i.title} ${i.excerpt ?? i.summary ?? ""}`);
    const subjectIds = activeWatches
      .map((w) => ({ subjectId: w.subjectId, q: squash(w.query) }))
      .filter(({ q }) => {
        const toks = q.split(/\s+/).filter(Boolean);
        return toks.every((t) => hay.includes(t));
      })
      .map(({ subjectId }) => subjectId);

    if (subjectIds.length) candidates.push({ item: i, subjectIds });
  }
  if (!candidates.length) {
    return { fetched: 0, kept: 0, inserted: 0, linked: 0, hydrateTargets: [] };
  }

  // 3) Do all DB writes atomically
  return await db.transaction(async (tx) => {
    const pubHints = candidates
      .map(({ item }) =>
        item.publicationSlug
          ? { slug: item.publicationSlug }
          : derivedPublicationFromUrl(item.url)
      )
      .filter(Boolean);

    const pubBySlug = await ensurePublicationInDB(tx, pubHints);

    // 3a) Insert sources (only matched) — normalize URL on write
    let slice: {
      url: string;
      title: string;
      published: Date;
      publicationId: string | undefined;
    }[] = [];

    const needUrls = candidates.map((c) => normalizeUrl(c.item.url));
    const beforeRows = await tx.query.sources.findMany({
      where: (s, { inArray }) => inArray(s.url, needUrls),
      columns: { id: true, url: true },
    });
    const beforeSet = new Set(beforeRows.map((r) => r.url));

    try {
      const rows = candidates.map(({ item: i }) => {
        const publicationId = i.publicationSlug
          ? pubBySlug.get(i.publicationSlug) ?? null
          : null;

        return {
          url: normalizeUrl(i.url),
          title: i.title,
          published: i.published,
          publicationId: publicationId ?? undefined,
          excerpt: i.excerpt ?? undefined,
          summary: i.summary ?? undefined,
          section: i.section ?? undefined,
          language: i.language ?? undefined,
          author: i.author ?? undefined,
          html: i.html ?? undefined,
        };
      });

      const BATCH = 25;
      for (let i = 0; i < rows.length; i += BATCH) {
        slice = rows.slice(i, i + BATCH);
        await tx
          .insert(sources)
          .values(slice)
          .onConflictDoNothing({ target: sources.url });
      }
    } catch (e: any) {
      // Fallback: try the first failing row with raw SQL to get the real PG error
      try {
        const r = slice[0];
        // Raw, minimal insert to surface native error details
        await tx.execute(sql`
        insert into "sources" ("url","title","published","publication_id")
        values (${r.url}, ${r.title}, ${r.published}, ${
          r.publicationId ?? null
        })
        on conflict ("url") do nothing
      `);
      } catch (inner: any) {
        console.error("[sources] RAW single-row probe failed:", inner);
      }
      console.error("[sources] INSERT failed (batched):", e);
      throw e;
    }
    // 3b) Resolve source IDs for ALL candidates (inserted + preexistingg

    const idRows = await tx.query.sources.findMany({
      where: (s, { inArray }) => inArray(s.url, needUrls),
      columns: { id: true, url: true },
    });
    const idByUrl = new Map(idRows.map((r: HydratorTarget) => [r.url, r.id]));

    // 3c) Link candidates to sources (dedupe subjectId:sourceId pairs)
    const pairs = candidates.flatMap((c) => {
      const normUrl = normalizeUrl(c.item.url);
      const sourceId = idByUrl.get(normUrl);
      if (!sourceId) return []; // skip if we somehow didn't resolve
      return c.subjectIds.map((subjectId) => ({ subjectId, sourceId }));
    });

    // dedupe
    const uniqPairs = Array.from(
      new Map(pairs.map((p) => [`${p.subjectId}:${p.sourceId}`, p])).values()
    );
    //double checking if paired data exists
    const sourceIds = [...new Set(uniqPairs.map((p) => p.sourceId))];
    const subjectIds = [...new Set(uniqPairs.map((p) => p.subjectId))];

    const existingSources = new Set(
      (
        await tx.query.sources.findMany({
          where: (s, { inArray }) => inArray(s.id, sourceIds),
          columns: { id: true },
        })
      ).map((r) => r.id)
    );
    const existingSubjects = new Set(
      (
        await tx.query.subjects.findMany({
          where: (s, { inArray }) => inArray(s.id, subjectIds),
          columns: { id: true },
        })
      ).map((r) => r.id)
    );

    const dropped = uniqPairs.filter(
      (p) =>
        !existingSources.has(p.sourceId) || !existingSubjects.has(p.subjectId)
    );
    if (dropped.length) {
      console.warn(
        "[subject_sources] skipping pairs with missing FK:",
        dropped.slice(0, 5),
        dropped.length > 5 ? `(+${dropped.length - 5} more)` : ""
      );
    }

    if (uniqPairs.length) {
      // Use a VALUES table + JOIN to ensure both FKs exist.
      const values = uniqPairs.map((p) => sql`(${p.subjectId}, ${p.sourceId})`);

      try {
        await tx.execute(sql`
      INSERT INTO "subject_sources" ("subject_id","source_id")
      SELECT v.subject_id, v.source_id
      FROM (VALUES ${sql.join(values, sql`,`)}) AS v(subject_id, source_id)
      JOIN "subjects" sub ON sub.id = v.subject_id
      JOIN "sources"  s   ON s.id   = v.source_id
      ON CONFLICT ("subject_id","source_id") DO NOTHING
    `);
      } catch (e: any) {
        console.error("[subject_sources] INSERT via JOIN failed:", {
          code: e?.code,
          message: e?.message,
          detail: e?.detail,
          constraint: e?.constraint,
        });
        throw e;
      }
    }

    // 3d) Build & insert ingestion events (with FK sourceId)
    const inserted = idRows.filter((r) => !beforeSet.has(r.url));
    const insertedUrlSet = new Set(inserted.map((r) => r.url));
    const events = candidates.map(({ item, subjectIds }) => {
      const normUrl = normalizeUrl(item.url);
      const sourceId = idByUrl.get(normUrl) ?? null;
      const status = insertedUrlSet.has(normUrl) ? "inserted" : "matched";
      const slug =
        item.publicationSlug ??
        derivedPublicationFromUrl(item.url)?.slug ??
        null;

      return {
        sourceUrl: normUrl,
        status,
        detail: JSON.stringify({
          adapterId,
          matchedSubjectIds: subjectIds,
          title: item.title,
          publicationSlug: slug,
          section: item.section ?? null,
          language: item.language ?? null,
          author: item.author ?? null,
          publishedAt: item.published?.toISOString?.() ?? null,
        }),
        sourceId, // FK to sources.id
      };
    });

    if (events.length) {
      await tx.insert(ingestionEvents).values(events);
    }

    //find which of these sources still have NO full text
    const sourceIdsInDB = idRows.map((r) => r.id);
    const haveText = new Set(
      (
        await tx.query.articleTexts.findMany({
          where: (t, { inArray }) => inArray(t.sourceId, sourceIdsInDB),
          columns: { sourceId: true },
        })
      ).map((r) => r.sourceId)
    );

    const hydrateTargets = idRows
      .filter((r: HydratorTarget) => !haveText.has(r.id))
      .map((r: HydratorTarget) => ({ id: r.id, url: r.url }));

    return {
      fetched: items.length,
      kept: candidates.length,
      inserted: inserted.length,
      linked: uniqPairs.length,
      hydrateTargets,
    };
  });
}
