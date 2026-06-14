import { prisma } from "@/lib/prisma";
import { daysAgo } from "./cashier-analytics";
export const LOW_STOCK_THRESHOLD = 5;
export const TARGET_COVER_DAYS = 14;
export type StockStatus = "out" | "low" | "ok";
export interface StockAnalyticsRow {
    id: string;
    name: string;
    barcode: string;
    price: number;
    stock: number;
    status: StockStatus;
    sold7d: number;
    sold30d: number;
    avgPerDay: number;
    daysLeft: number | null;
    targetStock: number;
    orderQty: number;
}
export interface AdminStockAnalyticsPayload {
    summary: {
        total: number;
        out: number;
        low: number;
        ok: number;
        unitsToOrder: number;
    };
    products: StockAnalyticsRow[];
}
function statusFor(stock: number): StockStatus {
    if (stock === 0)
        return "out";
    if (stock <= LOW_STOCK_THRESHOLD)
        return "low";
    return "ok";
}
export async function getAdminStockAnalytics(): Promise<AdminStockAnalyticsPayload> {
    const [products, sold7, sold30] = await Promise.all([
        prisma.product.findMany({
            where: { isActive: true },
            include: {
                barcodes: { take: 1, orderBy: { createdAt: "asc" } },
            },
            orderBy: [{ stock: "asc" }, { name: "asc" }],
        }),
        prisma.billItem.groupBy({
            by: ["productId"],
            where: {
                bill: {
                    status: "COMPLETED",
                    createdAt: { gte: daysAgo(6) },
                },
            },
            _sum: { quantity: true },
        }),
        prisma.billItem.groupBy({
            by: ["productId"],
            where: {
                bill: {
                    status: "COMPLETED",
                    createdAt: { gte: daysAgo(29) },
                },
            },
            _sum: { quantity: true },
        }),
    ]);
    const map7 = new Map(sold7.map((r) => [r.productId, r._sum.quantity ?? 0]));
    const map30 = new Map(sold30.map((r) => [r.productId, r._sum.quantity ?? 0]));
    let out = 0;
    let low = 0;
    let ok = 0;
    let unitsToOrder = 0;
    const rows: StockAnalyticsRow[] = products.map((p) => {
        const sold7d = map7.get(p.id) ?? 0;
        const sold30d = map30.get(p.id) ?? 0;
        const avgPerDay = sold7d / 7;
        const st = statusFor(p.stock);
        if (st === "out")
            out++;
        else if (st === "low")
            low++;
        else
            ok++;
        const targetStock = avgPerDay >= 0.1
            ? Math.max(LOW_STOCK_THRESHOLD + 1, Math.ceil(avgPerDay * TARGET_COVER_DAYS))
            : st !== "ok"
                ? LOW_STOCK_THRESHOLD + 5
                : p.stock;
        const orderQty = st !== "ok" || (avgPerDay > 0 && p.stock / avgPerDay < TARGET_COVER_DAYS)
            ? Math.max(0, targetStock - p.stock)
            : 0;
        unitsToOrder += orderQty;
        const daysLeft = avgPerDay > 0.05 ? Math.floor(p.stock / avgPerDay) : null;
        return {
            id: p.id,
            name: p.name,
            barcode: p.barcodes[0]?.barcode ?? "",
            price: p.price,
            stock: p.stock,
            status: st,
            sold7d,
            sold30d,
            avgPerDay: Math.round(avgPerDay * 10) / 10,
            daysLeft,
            targetStock,
            orderQty,
        };
    });
    return {
        summary: {
            total: products.length,
            out,
            low,
            ok,
            unitsToOrder,
        },
        products: rows,
    };
}

