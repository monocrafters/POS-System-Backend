import { prisma } from "@/lib/prisma";
export async function generateReturnNumber(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = `R-${y}${m}${d}-`;
    const startOfDay = new Date(y, now.getMonth(), now.getDate());
    const endOfDay = new Date(y, now.getMonth(), now.getDate() + 1);
    const count = await prisma.return.count({
        where: {
            createdAt: { gte: startOfDay, lt: endOfDay },
        },
    });
    return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

