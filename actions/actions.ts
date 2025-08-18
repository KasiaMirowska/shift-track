import { prisma } from "@/lib/prisma";

export async function listSubjects() {
  return await prisma.subject.findMany({
    orderBy: { createdAt: "desc" },
  });
}
