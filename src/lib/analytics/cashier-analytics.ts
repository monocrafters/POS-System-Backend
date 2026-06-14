import { prisma } from "@/lib/prisma";
import { buildDaySeries, buildWeekSeries, buildMonthSeries, buildYearSeries, type ChartPoint, } from "./sales-series";
export type { ChartPoint };
export type SalesPeriod = "day" | "week" | "month" | "year";
export function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
export function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
}
export function dateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}
export interface CashierAnalyticsPayload {
    today: {
        sales: number;
        bills: number;
        items: number;
        refunds: number;
        returnCount: number;
        netRevenue: number;
    };
    allTime: {
        sales: number;
        bills: number;
        items: number;
        refunds: number;
        returnCount: number;
        netRevenue: number;
        avgBill: number;
    };
    last7Days: ChartPoint[];
    series: {
        day: ChartPoint[];
        week: ChartPoint[];
        month: ChartPoint[];
        year: ChartPoint[];
    };
    topProducts: {
        name: string;
        quantity: number;
        revenue: number;
    }[];
    recentTodayBills: {
        id: string;
        billNumber: string;
        total: number;
        itemCount: number;
        createdAt: string;
    }[];
}
export async function getCashierAnalytics(cashierId: string): Promise<CashierAnalyticsPayload> {
    const todayStart = startOfToday();
    const yearStart = daysAgo(364);
    const billWhere = {
        cashierId,
        status: "COMPLETED" as const,
    };
    const returnWhere = { cashierId };
    const [todayAgg, allAgg, todayReturnsAgg, allReturnsAgg, periodBills, monthItems, todayBillsList,] = await Promise.all([
        prisma.bill.aggregate({
            where: { ...billWhere, createdAt: { gte: todayStart } },
            _sum: { total: true, itemCount: true },
            _count: true,
        }),
        prisma.bill.aggregate({
            where: billWhere,
            _sum: { total: true, itemCount: true },
            _count: true,
        }),
        prisma.return.aggregate({
            where: { ...returnWhere, createdAt: { gte: todayStart } },
            _sum: { refundAmount: true },
            _count: true,
        }),
        prisma.return.aggregate({
            where: returnWhere,
            _sum: { refundAmount: true },
            _count: true,
        }),
        prisma.bill.findMany({
            where: { ...billWhere, createdAt: { gte: yearStart } },
            select: { total: true, createdAt: true },
            orderBy: { createdAt: "asc" },
        }),
        prisma.billItem.findMany({
            where: {
                bill: {
                    ...billWhere,
                    createdAt: { gte: daysAgo(29) },
                },
            },
            select: { name: true, quantity: true, lineTotal: true },
        }),
        prisma.bill.findMany({
            where: { ...billWhere, createdAt: { gte: todayStart } },
            select: {
                id: true,
                billNumber: true,
                total: true,
                itemCount: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        }),
    ]);
    const todaySales = todayAgg._sum.total ?? 0;
    const todayRefunds = todayReturnsAgg._sum.refundAmount ?? 0;
    const allSales = allAgg._sum.total ?? 0;
    const allRefunds = allReturnsAgg._sum.refundAmount ?? 0;
    const allBills = allAgg._count;
    const series = {
        day: buildDaySeries(periodBills),
        week: buildWeekSeries(periodBills),
        month: buildMonthSeries(periodBills),
        year: buildYearSeries(periodBills),
    };
    const last7Days = series.week;
    const productMap = new Map<string, {
        name: string;
        quantity: number;
        revenue: number;
    }>();
    for (const item of monthItems) {
        const cur = productMap.get(item.name) ?? {
            name: item.name,
            quantity: 0,
            revenue: 0,
        };
        cur.quantity += item.quantity;
        cur.revenue += item.lineTotal;
        productMap.set(item.name, cur);
    }
    const topProducts = [...productMap.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);
    return {
        today: {
            sales: todaySales,
            bills: todayAgg._count,
            items: todayAgg._sum.itemCount ?? 0,
            refunds: todayRefunds,
            returnCount: todayReturnsAgg._count,
            netRevenue: todaySales - todayRefunds,
        },
        allTime: {
            sales: allSales,
            bills: allBills,
            items: allAgg._sum.itemCount ?? 0,
            refunds: allRefunds,
            returnCount: allReturnsAgg._count,
            netRevenue: allSales - allRefunds,
            avgBill: allBills > 0 ? allSales / allBills : 0,
        },
        last7Days,
        series,
        topProducts,
        recentTodayBills: todayBillsList.map((b) => ({
            ...b,
            createdAt: b.createdAt.toISOString(),
        })),
    };
}

