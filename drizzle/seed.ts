import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  users,
  subjects,
  publications,
  sources,
  opinions,
  publicationMetrics,
  subjectWatches,
  subjectFeeds,
  subjectSources,
  articleTexts,
} from "./schema";
import { v4 as uuidv4 } from "uuid";

// create connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

async function seed() {
  console.log("🌱 Seeding database...");
  const now = new Date();

  // --- USERS ---
  const userId = uuidv4();
  await db.insert(users).values({
    id: userId,
    email: "demo@example.com",
    name: "Demo User",
    createdAt: now,
  });
  console.log("✔ users seeded");

  // --- SUBJECTS ---
  const climateId = uuidv4();
  const trumpId = uuidv4();
  const bidenId = uuidv4();
  await db.insert(subjects).values([
    {
      id: climateId,
      slug: "climate-change",
      name: "Climate Change",
      type: "TOPIC",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: trumpId,
      slug: "donald-trump",
      name: "Donald Trump",
      type: "PERSON",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: bidenId,
      slug: "joe-biden",
      name: "Joe Biden",
      type: "PERSON",
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log("✔ subjects seeded");

  // --- PUBLICATIONS ---
  const nytId = uuidv4();
  const guardianId = uuidv4();
  await db.insert(publications).values([
    {
      id: nytId,
      slug: "nytimes",
      name: "New York Times",
      domain: "nytimes.com",
      createdAt: now,
    },
    {
      id: guardianId,
      slug: "guardian",
      name: "The Guardian",
      domain: "theguardian.com",
      createdAt: now,
    },
  ]);
  console.log("✔ publications seeded");

  // --- SOURCES ---
  const sourceId = uuidv4();
  await db.insert(sources).values({
    id: sourceId,
    url: "https://nytimes.com/example-article",
    title: "Example Article on Climate",
    publicationId: nytId,
    published: now,
    createdAt: now,
    excerpt: "An article about climate change...",
    summary: "Summary of the article",
    sentiment: 0.42,
    wordCount: 1200,
  });
  console.log("✔ sources seeded");

  // --- OPINIONS ---
  const opinionId = uuidv4();
  await db.insert(opinions).values({
    id: opinionId,
    subjectId: climateId,
    sourceId,
    quote: "We must take urgent action on climate change.",
    summary: "Strong pro-action stance",
    sentiment: 0.9,
    stance: "positive",
    saidAt: now,
    createdAt: now,
  });
  console.log("✔ opinions seeded");

  // --- PUBLICATION METRICS ---
  const metricId = uuidv4();
  await db.insert(publicationMetrics).values({
    id: metricId,
    publicationId: nytId,
    day: now,
    avgSentiment: 0.35,
    articlesCount: 10,
  });
  console.log("✔ publication_metrics seeded");

  // --- SUBJECT WATCHES ---
  const watchId = uuidv4();
  await db.insert(subjectWatches).values({
    id: watchId,
    subjectId: climateId,
    query: "climate change OR global warming",
    enabled: true,
    createdAt: now,
  });
  console.log("✔ subject_watches seeded");

  // --- SUBJECT FEEDS ---
  await db.insert(subjectFeeds).values({
    id: uuidv4(),
    watchId,
    url: "https://feeds.nytimes.com/climate",
    createdAt: now,
  });
  console.log("✔ subject_feeds seeded");

  // --- SUBJECT SOURCES ---
  await db.insert(subjectSources).values({
    id: uuidv4(),
    subjectId: climateId,
    sourceId,
    createdAt: now,
  });
  console.log("✔ subject_sources seeded");

  // --- ARTICLE TEXTS ---
  await db.insert(articleTexts).values({
    sourceId,
    text: "This is the full text body of the example article on climate change.",
  });
  console.log("✔ article_texts seeded");

  console.log("✅ Done seeding!");
  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seeding error:", err);
  pool.end();
});
