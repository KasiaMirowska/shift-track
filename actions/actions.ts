// src/actions/subjects.ts
import { revalidatePath } from "next/cache";

import {
  subjects,
  subjectWatches,
  subjectSources,
  opinions,
} from "drizzle/schema";
import { CreateSubjectSchema } from "lib/validation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "drizzle/db";

/** ---------- listSubjects (with counts) ---------- **/
export async function listSubjects() {
  console.log("GETTING");
  try {
    const data = db
      .select({
        id: subjects.id,
        slug: subjects.slug,
        name: subjects.name,
        type: subjects.type,
        createdAt: subjects.createdAt,
        updatedAt: subjects.updatedAt,
        // counts (use DISTINCT where appropriate)
        watchesCount: sql<number>`count(distinct ${subjectWatches.id})`,
        sourcesCount: sql<number>`count(distinct ${subjectSources.sourceId})`,
        opinionsCount: sql<number>`count(distinct ${opinions.id})`,
      })
      .from(subjects)
      .leftJoin(subjectWatches, eq(subjectWatches.subjectId, subjects.id))
      .leftJoin(subjectSources, eq(subjectSources.subjectId, subjects.id))
      .leftJoin(opinions, eq(opinions.subjectId, subjects.id))
      .groupBy(
        subjects.id,
        subjects.slug,
        subjects.name,
        subjects.type,
        subjects.createdAt,
        subjects.updatedAt
      )
      .orderBy(desc(subjects.createdAt));
    return data;
  } catch (e) {
    console.log("EEEEEEE", e);
  }
}

export async function getSubjectDetailBySlug(slug: string, limit = 10) {
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
        },
        orderBy: desc(opinions.saidAt),
        limit,
      },
      watches: {
        columns: {
          id: true,
          query: true,
          enabled: true,
        },
      },
      sources: {
        columns: {},
        with: {
          source: true,
        },
      },
    },
  });

  return subject ?? null;
}
// Type of one element in the list
export type Subject = Awaited<ReturnType<typeof listSubjects>>[number];

/** ---------- helpers ---------- **/
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** ---------- createSubject (upsert-by-unique name+type) ---------- **/
export async function createSubject(formData: FormData) {
  const parsed = CreateSubjectSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false as const, error: message };
  }

  const { name, type } = parsed.data;
  const slug = slugify(`${name}-${type}`);

  try {
    // Insert; if (name, type) exists, do nothing (no-op), which matches your Prisma upsert(update:{})
    await db
      .insert(subjects)
      .values({ name, type, slug })
      .onConflictDoNothing({
        target: [subjects.name, subjects.type], // matches the unique("name_type") in your schema
      });
  } catch {
    return { ok: false as const, error: "Failed to save subject" };
  }

  revalidatePath("/");
  return { ok: true as const };
}
