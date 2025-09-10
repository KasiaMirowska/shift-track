"use server";
import { revalidatePath } from "next/cache";

import {
  subjects,
  subjectWatches,
  subjectSources,
  opinions,
  subjectFeeds,
  feeds,
  sources,
} from "drizzle/schema";
import { CreateSubjectSchema } from "lib/validation";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "drizzle/db";
import type {
  CreateSubjectState,
  DetailLimits,
  SUBJECT_TYPES,
  SubjectWatches,
} from "lib/types";
import { redirect } from "next/navigation";
import * as _ from "lodash";
import { resolveFeedsForWatch } from "lib/resolveFeedsForWatch";

// export async function diagCounts() {
//   const { rows } = await db.execute(sql`
//     SELECT
//       current_database() AS db,
//       current_user     AS "user",
//       (SELECT COUNT(*) FROM subjects) AS subjects,
//       (SELECT COUNT(*) FROM subject_watches) AS watches_total,
//       (SELECT COUNT(*) FROM subject_watches WHERE enabled) AS watches_enabled,
//       (SELECT COUNT(*) FROM subject_watches w JOIN subjects s ON s.id = w.subject_id) AS watches_joined
//   `);
//   console.log("DIAG", rows[0]);
//   return rows[0];
// }

// export async function listSubjectsRaw() {
//   const { rows } = await db.execute(sql`
//     SELECT
//       s.id,
//       s.slug,
//       s.name,
//       s.type,
//       s.created_at AS "createdAt",
//       s.updated_at AS "updatedAt",
//       (
//         SELECT COUNT(*)
//         FROM subject_watches w
//         WHERE w.subject_id = s.id
//       ) AS "watchesCount",
//       (
//         SELECT COUNT(DISTINCT ss.source_id)
//         FROM subject_sources ss
//         WHERE ss.subject_id = s.id
//       ) AS "sourcesCount",
//       (
//         SELECT COUNT(*)
//         FROM opinions o
//         WHERE o.subject_id = s.id
//       ) AS "opinionsCount"
//     FROM subjects s
//     ORDER BY s.created_at DESC
//   `);

//   return rows.map((r) => ({
//     ...r,
//     watchesCount: Number(r.watchesCount),
//     sourcesCount: Number(r.sourcesCount),
//     opinionsCount: Number(r.opinionsCount),
//   }));
// }
/** ---------- listSubjects (with counts) ---------- **/

export async function listSubjects() {
  // 1) Pre-aggregate each count with an alias
  const w = db
    .select({
      subjectId: subjectWatches.subjectId,
      watchCount: sql<number>`
        SUM(CASE WHEN ${subjectWatches.enabled} THEN 1 ELSE 0 END)
      `
        .mapWith(Number)
        .as("watchCount"),
    })
    .from(subjectWatches)
    .groupBy(subjectWatches.subjectId)
    .as("w");

  const ss = db
    .select({
      subjectId: subjectSources.subjectId,
      sourceCount: sql<number>`COUNT(DISTINCT ${subjectSources.sourceId})`
        .mapWith(Number)
        .as("sourceCount"),
    })
    .from(subjectSources)
    .groupBy(subjectSources.subjectId)
    .as("ss");

  const o = db
    .select({
      subjectId: opinions.subjectId,
      opinionCount: sql<number>`COUNT(*)`.mapWith(Number).as("opinionCount"),
    })
    .from(opinions)
    .groupBy(opinions.subjectId)
    .as("o");

  // 2) Join and reference the aliased fields
  const rows = await db
    .select({
      id: subjects.id,
      slug: subjects.slug,
      name: subjects.name,
      type: subjects.type,
      createdAt: subjects.createdAt,
      updatedAt: subjects.updatedAt,
      watchesCount: sql<number>`COALESCE(${w.watchCount}, 0)`.mapWith(Number),
      sourcesCount: sql<number>`COALESCE(${ss.sourceCount}, 0)`.mapWith(Number),
      opinionsCount: sql<number>`COALESCE(${o.opinionCount}, 0)`.mapWith(
        Number
      ),
    })
    .from(subjects)
    .leftJoin(w, eq(w.subjectId, subjects.id))
    .leftJoin(ss, eq(ss.subjectId, subjects.id))
    .leftJoin(o, eq(o.subjectId, subjects.id))
    .orderBy(desc(subjects.createdAt));

  return rows;
}

export async function getSubjectDetailBySlug(
  slug: string,
  limitOrOptions: number | DetailLimits = 10
) {
  const {
    opinionsLimit = typeof limitOrOptions === "number" ? limitOrOptions : 10,
    articlesLimit = typeof limitOrOptions === "number" ? limitOrOptions : 10,
    feedsPerWatchLimit = 50,
  } = typeof limitOrOptions === "number" ? {} : limitOrOptions;

  // 1) Load subject with opinions and feeds (via watches ➜ subject_feeds ➜ feeds)
  const [subject] = await db.query.subjects.findMany({
    where: (s, { eq }) => eq(s.slug, slug),
    with: {
      opinions: {
        columns: {
          id: true,
          saidAt: true,
          summary: true,
          quote: true,
          sentiment: true,
          sourceId: true,
        },
        orderBy: (o, { desc }) => [desc(o.saidAt)],
        limit: opinionsLimit,
        with: {
          source: {
            columns: {
              id: true,
              url: true,
              title: true,
              published: true,
              publicationId: true,
            },
            // with: {
            //   publication: {
            //     columns: { id: true, slug: true, name: true, domain: true },
            //   },
            // },
          },
        },
      },

      watches: {
        columns: { id: true, query: true, enabled: true },
        with: {
          feeds: {
            columns: { id: true, enabled: true, createdAt: true, feedId: true },
            limit: feedsPerWatchLimit,
            with: {
              // requires subjectFeedsRelations to have `feed: one(feeds, ...)`
              feed: {
                columns: {
                  id: true,
                  url: true,
                  title: true,
                  section: true,
                  lang: true,
                  region: true,
                  type: true,
                  publicationId: true,
                },
                // with: {
                //   publication: {
                //     columns: { id: true, slug: true, name: true, domain: true },
                //   },
                // },
              },
            },
          },
        },
      },
    },
  });

  if (!subject) return null;

  // 2) Fetch articles for the subject with a clean JOIN (DB-side order + limit)
  const articles = await db
    .select({
      id: S.id,
      url: S.url,
      title: S.title,
      published: S.published,
      excerpt: S.excerpt,
      summary: S.summary,
      sentiment: S.sentiment,
      section: S.section,
      language: S.language,
      wordCount: S.wordCount,
      publication: {
        id: publications.id,
        slug: publications.slug,
        name: publications.name,
        domain: publications.domain,
      },
      articleText: {
        sourceId: AT.sourceId,
        text: AT.text,
        // html: AT.html, // include if you want it
      },
    })
    .from(SS)
    .innerJoin(S, eq(SS.sourceId, S.id))
    .leftJoin(publications, eq(S.publicationId, publications.id))
    .leftJoin(AT, eq(AT.sourceId, S.id))
    .where(eq(SS.subjectId, subject.id))
    .orderBy(desc(S.published))
    .limit(articlesLimit);

  // 3) Return combined payload (subject + articles)
  return {
    ...subject,
    articles,
  };
}
// Type of one element in the list
export type SubjectListItem = Awaited<ReturnType<typeof listSubjects>>[number];

/** ---------- helpers ---------- **/
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** ------------- helpers ------------------ */
async function findSubjectBySlug(tx: typeof db, slug: string) {
  return tx
    .select({ id: subjects.id })
    .from(subjects)
    .where(eq(subjects.slug, slug))
    .limit(1);
}

async function insertSubject(
  tx: typeof db,
  name: string,
  type: SUBJECT_TYPES,
  slug: string
) {
  const inserted = await tx
    .insert(subjects)
    .values({ name, type, slug })
    .returning({ id: subjects.id });
  return inserted[0].id;
}

async function updateSubject(
  tx: typeof db,
  subjectId: string,
  name: string,
  type: SUBJECT_TYPES
) {
  return tx
    .update(subjects)
    .set({ name, type })
    .where(eq(subjects.id, subjectId));
}
async function getActiveWatch(tx: typeof db, subjectId: string) {
  return tx.query.subjectWatches.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.subjectId, subjectId), eq(t.enabled, true)),
    columns: { id: true, query: true, createdAt: true },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
}

async function createDefaultWatch(
  tx: typeof db,
  subjectId: string,
  defaultQuery: string
) {
  const [row] = await tx
    .insert(subjectWatches)
    .values({ subjectId, query: defaultQuery, enabled: true })
    .returning({ id: subjectWatches.id, query: subjectWatches.query });
  return row;
}

async function ensureActiveWatch(
  tx: typeof db,
  subjectId: string,
  subjectName: string
) {
  const existing = await getActiveWatch(tx, subjectId);
  if (existing) return { watchId: existing.id, query: existing.query };

  const defaultQuery = `"${subjectName}"`;
  const row = await createDefaultWatch(tx, subjectId, defaultQuery);
  return { watchId: row.id, query: row.query };
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

function inferFeedRow(url: string) {
  const isGuardianApi = /content\.guardianapis\.com/i.test(url);
  return {
    url,
    type: (isGuardianApi ? "api" : "rss") as "api" | "rss",
    adapterKey: isGuardianApi ? "guardian-api" : "rss",
    active: true as const,
  };
}

/**
 * Ensure every URL has a row in `feeds`, and return url->feedId
 * Safe for concurrent runs thanks to ON CONFLICT DO NOTHING.
 */
async function ensureFeedsExist(
  tx: typeof db,
  urls: string[]
): Promise<Map<string, string>> {
  const uniq = Array.from(new Set(urls.filter(Boolean)));
  if (uniq.length === 0) return new Map();

  // find existing
  const existing = await tx
    .select({ id: feeds.id, url: feeds.url })
    .from(feeds)
    .where(inArray(feeds.url, uniq));

  const byUrl = new Map(existing.map((r) => [r.url, r.id]));

  // insert missing
  const toInsert = uniq.filter((u) => !byUrl.has(u)).map(inferFeedRow);
  if (toInsert.length) {
    await tx.insert(feeds).values(toInsert).onConflictDoNothing();

    // re-read to capture ids for newly inserted rows
    const rows = await tx
      .select({ id: feeds.id, url: feeds.url })
      .from(feeds)
      .where(inArray(feeds.url, uniq));
    return new Map(rows.map((r) => [r.url, r.id]));
  }
  console.log("RIGHT NOW BYURL", byUrl);
  return byUrl;
}

/** Link a watch to feedIds via subject_feeds (new schema). */
async function linkWatchToFeedIds(
  tx: typeof db,
  watchId: string,
  feedIds: string[]
) {
  if (!feedIds.length) return;
  await tx
    .insert(subjectFeeds)
    .values(feedIds.map((feedId) => ({ watchId, feedId })))
    .onConflictDoNothing();
}

/** Convenience: take either IDs OR URLs and return only feedIds. */
async function toFeedIds(
  tx: typeof db,
  candidates: string[]
): Promise<string[]> {
  if (!candidates.length) return [];
  // If they already look like IDs, use them as-is
  if (candidates.every((x) => isUuid(x))) return candidates;

  // Otherwise assume URLs and map to IDs
  const map = await ensureFeedsExist(tx, candidates);
  return candidates
    .map((u) => map.get(u))
    .filter((x): x is string => typeof x === "string");
}

/** ---------- createSubject (upsert-by-unique name+type) ---------- **/

export async function createSubject(formData: FormData) {
  console.log("CREATING?????? OR FAILING EARLIER?");
  const parsed = CreateSubjectSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  console.log("starting the subject creation");
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    redirect(`/search-subject?error=${encodeURIComponent(message)}`);
  }

  const { name, type } = parsed.data;

  if (!name || !type) return;

  const slug = slugify(`${name}-${type}`);
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    await db.transaction(async (tx) => {
      const existing = await findSubjectBySlug(tx, slug);
      let subjectId: string;

      if (existing.length) {
        subjectId = existing[0].id;
        await updateSubject(tx, subjectId, name, type); //will be used later with updates
      } else {
        subjectId = await insertSubject(tx, name, type, slug);

        // 2) MVP => check if there is already a watch for this subject
        const { watchId, query } = await ensureActiveWatch(tx, subjectId, name);
        console.log("MADE WATCH HERE???", watchId, query);
        // 3) resolve feeds for the new watch and upsert into subject_feeds
        const feedUrls = await resolveFeedsForWatch({
          subjectName: name,
          query,
        });

        const feedIds = await toFeedIds(tx, feedUrls);
        await linkWatchToFeedIds(tx, watchId, feedIds);
      }
    });
  } catch (e: any) {
    console.error("DB INSERT ERROR", e);
    redirect(`/search-subject?error=${encodeURIComponent(e)}`);
  }

  revalidatePath("/");
  redirect("/subject-list");
}

export async function addWatch(formData: FormData) {
  const subjectId = String(formData.get("subjectId") ?? "");
  const query = String(formData.get("query") ?? "");

  if (!subjectId || !query || (_.isEmpty(subjectId) && _.isEmpty(query)))
    return;

  let watches: SubjectWatches[] = [];
  await db.transaction(async (tx) => {
    const watches = await tx
      .insert(subjectWatches)
      .values({ subjectId, query })
      .returning();

    const watchId = watches[0].id;

    // Fetch subject name for resolver context (optional)
    const s = await tx.query.subjects.findFirst({
      where: eq(subjects.id, subjectId),
      columns: { name: true },
    });
    const feedUrls = await resolveFeedsForWatch({
      subjectName: s?.name ?? "",
      query,
    });

    const feedIds = await toFeedIds(tx, feedUrls);
    await linkWatchToFeedIds(tx, watchId, feedIds);
  });
  revalidatePath(`/subjects/${subjectId}`);
}

export async function updateWatch(formData: FormData) {
  const watchId = String(formData.get("watchId") ?? "");
  const query = String(formData.get("query") ?? "").trim();
  if (!watchId || !query) return;

  await db.transaction(async (tx) => {
    // update the watch row
    await tx
      .update(subjectWatches)
      .set({ query })
      .where(eq(subjectWatches.id, watchId));

    // find subject for better feed resolution (optional)
    const w = await tx.query.subjectWatches.findFirst({
      where: eq(subjectWatches.id, watchId),
      with: { subject: { columns: { name: true } } },
    });

    const feedUrls = await resolveFeedsForWatch({
      subjectName: w?.subject?.name ?? "",
      query,
    });

    // Replace strategy: wipe old feeds for this watch, then insert the new set
    await tx.delete(subjectFeeds).where(eq(subjectFeeds.watchId, watchId));

    const feedIds = await toFeedIds(tx, feedUrls);

    // Replace strategy
    await tx.delete(subjectFeeds).where(eq(subjectFeeds.watchId, watchId));
    await linkWatchToFeedIds(tx, watchId, feedIds);
  });

  // revalidate subject detail path
}
