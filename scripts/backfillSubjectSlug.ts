import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function main(): Promise<void> {
  const rows = await prisma.subject.findMany({
    select: { id: true, name: true, slug: true },
  });

  for (const r of rows) {
    const desired = slugify(r.name);
    if (r.slug !== desired) {
      await prisma.subject.update({
        where: { id: r.id },
        data: { slug: desired },
      });
    }
  }
}

main()
  .then(async () => {
    const count = await prisma.subject.count();
    console.log(`Backfill complete. Subjects updated: ${count}`);
  })
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
