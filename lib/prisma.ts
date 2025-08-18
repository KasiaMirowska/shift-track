// src/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ✅ App-level enum mirror (matches your schema exactly)
export const SubjectType = {
  PERSON: "PERSON",
  ORGANIZATION: "ORGANIZATION",
  POLICY: "POLICY",
  TOPIC: "TOPIC",
} as const;

export type SubjectType = (typeof SubjectType)[keyof typeof SubjectType];
