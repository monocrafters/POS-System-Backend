import { PrismaClient } from "@prisma/client";

if (process.env.VERCEL && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("file:") && !process.env.DATABASE_URL.startsWith("file:/tmp/"))) {
    process.env.DATABASE_URL = "file:/tmp/pos.db";
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
if (process.env.NODE_ENV !== "production" || process.env.VERCEL) {
    globalForPrisma.prisma = prisma;
}

