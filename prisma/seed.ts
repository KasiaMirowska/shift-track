import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** ---------- helpers ---------- **/

let _seed = 42;
function rand() {
  _seed ^= _seed << 13;
  _seed ^= _seed >> 17;
  _seed ^= _seed << 5;
  return Math.abs(_seed) / 2 ** 31;
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function clamp01(x: number) {
  return Math.max(-1, Math.min(1, x));
}
function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(randInt(8, 20), randInt(0, 59), randInt(0, 59), 0);
  return d;
}
function sample<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)];
}

type SentimentProfile = {
  mean: number;
  jitter: number;
  stancePool: string[];
  quotePool: string[];
  summaryPool: string[];
};

function sampleSentiment(p: SentimentProfile) {
  const noise = (rand() + rand() + rand()) / 3; // 0..1
  const signed = (noise - 0.5) * 2; // -1..1
  return clamp01(p.mean + signed * p.jitter);
}

async function main() {
  console.log("Resetting (dev)...");
  await prisma.opinion.deleteMany({});
  await prisma.subjectSource.deleteMany({});
  await prisma.source.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.publicationMetricDaily.deleteMany({});
  await prisma.publication.deleteMany({});

  function slugify(input: string) {
    return input
      .toLowerCase()
      .normalize("NFKD") // strip accents
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-") // non-alphanum -> dashes
      .replace(/^-+|-+$/g, "") // trim dashes
      .replace(/-{2,}/g, "-"); // collapse repeats
  }

  // --- Publications (require: name, domain) ---
  const nyt = await prisma.publication.create({
    data: {
      name: "The New York Times",
      domain: "nytimes.com",
      slug: slugify("The New York Times"),
    },
  });
  const guardian = await prisma.publication.create({
    data: {
      name: "The Guardian",
      domain: "theguardian.com",
      slug: slugify("The Guardian"),
    },
  });

  // 14 days of metrics per pub
  const pubs = [nyt, guardian];
  const metricsData: {
    publicationId: string;
    day: Date;
    avgSentiment: number;
    articlesCount: number;
  }[] = [];

  for (const pub of pubs) {
    for (let i = 0; i < 14; i++) {
      const day = daysAgo(14 - i);
      const base = pub.id === guardian.id ? 0.2 : 0.0;
      metricsData.push({
        publicationId: pub.id,
        // store day truncated to midnight UTC
        day: new Date(
          Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())
        ),
        avgSentiment: clamp01(base + (rand() - 0.5) * 0.6),
        articlesCount: randInt(8, 30),
      });
    }
  }
  await prisma.publicationMetricDaily.createMany({
    data: metricsData,
    skipDuplicates: true,
  });

  // --- Subjects (require: name, type enum) ---
  // Use string literals to avoid $Enums export issues

  // --- Subjects (require: name, type enum, now slug) ---
  const [trump, climate] = await prisma.$transaction([
    prisma.subject.create({
      data: {
        name: "Donald Trump",
        slug: slugify("Donald Trump"), // "donald-trump"
        type: "PERSON",
      },
    }),
    prisma.subject.create({
      data: {
        name: "Climate Change",
        slug: slugify("Climate Change"), // "climate-change"
        type: "TOPIC",
      },
    }),
  ]);

  // --- Sources (likely require: domain) ---
  // --- Sources (articles require: url, title, published) ---
  const [nytimesSource, guardianSource] = await prisma.$transaction([
    prisma.source.create({
      data: {
        url: "https://www.nytimes.com/2025/08/12/politics/trump-campaign-rally.html",
        title: "At Rally, Trump Sharpens Attacks Ahead of Fall Campaign",
        published: new Date("2025-08-12T14:00:00Z"),
        // optional extras:
        excerpt:
          "The former president criticized mainstream media and outlined priorities...",
        summary: "Coverage focused on rhetoric and legal overhang.",
        sentiment: -0.3,
        wordCount: 950,
        publication: { connect: { id: nyt.id } },
      },
    }),
    prisma.source.create({
      data: {
        url: "https://www.theguardian.com/environment/2025/aug/13/climate-report-rising-sea-levels",
        title: "New report warns of accelerating sea-level rise",
        published: new Date("2025-08-13T09:30:00Z"),
        excerpt: "Scientists urge immediate action as projections worsen...",
        summary: "Report emphasizes urgency and policy coordination.",
        sentiment: 0.6,
        wordCount: 780,
        publication: { connect: { id: guardian.id } },
      },
    }),
  ]);

  // Join Subject ↔ Source
  await prisma.subjectSource.createMany({
    data: [
      { subjectId: trump.id, sourceId: nytimesSource.id },
      { subjectId: trump.id, sourceId: guardianSource.id },
      { subjectId: climate.id, sourceId: guardianSource.id },
      { subjectId: climate.id, sourceId: nytimesSource.id },
    ],
    skipDuplicates: true,
  });

  // --- Opinion profiles ---
  const trumpOnNYT: SentimentProfile = {
    mean: -0.25,
    jitter: 0.55,
    stancePool: ["critical", "skeptical", "neutral"],
    quotePool: [
      "Trump criticized the media during a rally.",
      "Legal actions against Trump intensified this week.",
      "Trump reiterated his stance on immigration.",
      "Campaign officials doubled down on messaging.",
    ],
    summaryPool: [
      "Coverage emphasized legal risks and controversies.",
      "Mixed evaluation of policy proposals.",
      "Focus on rhetoric and media strategy.",
      "Analysis of campaign momentum.",
    ],
  };
  const trumpOnGuardian: SentimentProfile = {
    mean: -0.35,
    jitter: 0.5,
    stancePool: ["critical", "skeptical"],
    quotePool: [
      "UK column highlighted risks of Trump's policy agenda.",
      "Guardian op-ed questioned democratic norms.",
      "Report scrutinized statements from the rally.",
      "Analysis compared polling to prior cycles.",
    ],
    summaryPool: [
      "Tone leaned negative with institutional concerns.",
      "Democracy and rule-of-law themes were prominent.",
      "Emphasis on fact-checking and accountability.",
      "Outlook remained cautious.",
    ],
  };
  const climateOnGuardian: SentimentProfile = {
    mean: 0.55,
    jitter: 0.4,
    stancePool: ["supportive", "urgent", "neutral"],
    quotePool: [
      "Scientists warn of accelerating sea-level rise.",
      "Policy proposal targets net-zero acceleration.",
      "Communities adapt to record-breaking heat.",
      "New report urges immediate emissions cuts.",
    ],
    summaryPool: [
      "Broadly supportive tone on climate action.",
      "Evidence-driven reporting with policy angles.",
      "Human-impact stories framed solutions.",
      "Momentum building for transition.",
    ],
  };
  const climateOnNYT: SentimentProfile = {
    mean: 0.3,
    jitter: 0.5,
    stancePool: ["supportive", "neutral", "analytical"],
    quotePool: [
      "US states explore grid modernization.",
      "Corporate climate disclosures scrutinized.",
      "Wildfire season reshapes preparedness plans.",
      "Renewables investment faces supply chain hurdles.",
    ],
    summaryPool: [
      "Mixed but generally constructive tone.",
      "Emphasis on policy trade-offs and economics.",
      "Coverage balanced costs and benefits.",
      "Spotlight on implementation challenges.",
    ],
  };

  const pairs = [
    { subjectId: trump.id, sourceId: nytimesSource.id, profile: trumpOnNYT },
    {
      subjectId: trump.id,
      sourceId: guardianSource.id,
      profile: trumpOnGuardian,
    },
    {
      subjectId: climate.id,
      sourceId: guardianSource.id,
      profile: climateOnGuardian,
    },
    {
      subjectId: climate.id,
      sourceId: nytimesSource.id,
      profile: climateOnNYT,
    },
  ] as const;

  const opinions: {
    subjectId: string;
    sourceId: string;
    quote: string;
    summary?: string | null;
    sentiment: number;
    stance?: string | null;
    saidAt: Date;
  }[] = [];

  for (const pair of pairs) {
    const count = randInt(5, 12);
    for (let i = 0; i < count; i++) {
      opinions.push({
        subjectId: pair.subjectId,
        sourceId: pair.sourceId,
        quote: sample(pair.profile.quotePool),
        summary: sample(pair.profile.summaryPool),
        sentiment: sampleSentiment(pair.profile),
        stance: sample(pair.profile.stancePool),
        saidAt: daysAgo(randInt(0, 30)),
      });
    }
  }

  await prisma.opinion.createMany({ data: opinions });

  console.log("Seed completed ✅");
  console.table({
    publications: pubs.length,
    metricsRows: metricsData.length,
    subjects: 2,
    sources: 2,
    opinions: opinions.length,
  });
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
