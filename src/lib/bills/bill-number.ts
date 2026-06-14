import { prisma } from "@/lib/prisma";
export async function generateBillNumber(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = `B-${y}${m}${d}-`;
    const startOfDay = new Date(y, now.getMonth(), now.getDate());
    const endOfDay = new Date(y, now.getMonth(), now.getDate() + 1);
    const count = await prisma.bill.count({
        where: {
            createdAt: { gte: startOfDay, lt: endOfDay },
        },
    });
    const seq = String(count + 1).padStart(4, "0");
    return `${prefix}${seq}`;
}

