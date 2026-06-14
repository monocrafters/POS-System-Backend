import { prisma } from "@/lib/prisma";
import { buildDaySeries, buildWeekSeries, buildMonthSeries, buildYearSeries, type ChartPoint, } from "./sales-series";
import { daysAgo, startOfToday } from "./cashier-analytics";
export type { ChartPoint };
export type SalesPeriod = "day" | "week" | "month" | "year";
export interface PeriodBreakdown {
    grossSales: number;
    discounts: number;
    refunds: number;
    netRevenue: number;
    costOfGoods: number;
    grossProfit: number;
    profitMargin: number;
    bills: number;
    itemsSold: number;
    returns: number;
    avgBill: number;
}
export interface AdminAnalyticsPayload {
    today: PeriodBreakdown;
    yesterday: PeriodBreakdown;
    periods: Record<SalesPeriod, PeriodBreakdown>;
    allTime: {
        sales: number;
        bills: number;
        netRevenue: number;
        grossProfit: number;
        avgBill: number;
        refunds: number;
    };
    series: {
        day: ChartPoint[];
        week: ChartPoint[];
        month: ChartPoint[];
        year: ChartPoint[];
    };
    topProductsByPeriod: Record<SalesPeriod, {
        name: string;
        quantity: number;
        revenue: number;
        profit: number;
    }[]>;
    topCashiers: {
        name: string;
        sales: number;
        bills: number;
    }[];
    recentBills: {
        id: string;
        billNumber: string;
        total: number;
        itemCount: number;
        cashierName: string;
        createdAt: string;
    }[];
}
async function profitFromItems(since: Date): Promise<{
    costOfGoods: number;
    grossProfit: number;
    profitMargin: number;
}> {
    const [items, returnItems] = await Promise.all([
        prisma.billItem.findMany({
            where: {
                bill: { status: "COMPLETED", createdAt: { gte: since } },
            },
            select: {
                lineTotal: true,
                quantity: true,
                unitCost: true,
                bill: { select: { subtotal: true, total: true } },
            },
        }),
        prisma.returnItem.findMany({
            where: { return: { createdAt: { gte: since } } },
            select: {
                lineRefund: true,
                quantity: true,
                billItem: { select: { unitCost: true } },
            },
        }),
    ]);
    let revenue = 0;
    let costOfGoods = 0;
    for (const item of items) {
        const scale = item.bill.subtotal > 0 ? item.bill.total / item.bill.subtotal : 1;
        const effectiveLine = item.lineTotal * scale;
        revenue += effectiveLine;
        costOfGoods += item.unitCost * item.quantity;
    }
    const refunds = returnItems.reduce((s, r) => s + r.lineRefund, 0);
    const returnedCogs = returnItems.reduce((s, r) => s + r.billItem.unitCost * r.quantity, 0);
    const grossProfit = revenue - costOfGoods - refunds + returnedCogs;
    return {
        costOfGoods: Math.max(0, costOfGoods - returnedCogs),
        grossProfit,
        profitMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    };
}
async function periodBreakdown(since: Date): Promise<PeriodBreakdown> {
    const [bills, returns, items, profit] = await Promise.all([
        prisma.bill.aggregate({
            where: { status: "COMPLETED", createdAt: { gte: since } },
            _sum: { total: true, discountAmount: true, itemCount: true },
            _count: true,
        }),
        prisma.return.aggregate({
            where: { createdAt: { gte: since } },
            _sum: { refundAmount: true },
            _count: true,
        }),
        prisma.billItem.aggregate({
            where: {
                bill: { status: "COMPLETED", createdAt: { gte: since } },
            },
            _sum: { quantity: true },
        }),
        profitFromItems(since),
    ]);
    const gross = bills._sum.total ?? 0;
    const discounts = bills._sum.discountAmount ?? 0;
    const refunds = returns._sum.refundAmount ?? 0;
    const billCount = bills._count;
    return {
        grossSales: gross,
        discounts,
        refunds,
        netRevenue: gross - refunds,
        costOfGoods: profit.costOfGoods,
        grossProfit: profit.grossProfit,
        profitMargin: gross > 0 ? (profit.grossProfit / gross) * 100 : 0,
        bills: billCount,
        itemsSold: items._sum.quantity ?? 0,
        returns: returns._count,
        avgBill: billCount > 0 ? gross / billCount : 0,
    };
}
function topProductsFromItems(items: {
    name: string;
    quantity: number;
    lineTotal: number;
    unitCost: number;
    createdAt: Date;
    billSubtotal: number;
    billTotal: number;
}[], since: Date) {
    const map = new Map<string, {
        name: string;
        quantity: number;
        revenue: number;
        profit: number;
    }>();
    for (const item of items) {
        if (item.createdAt < since)
            continue;
        const scale = item.billSubtotal > 0 ? item.billTotal / item.billSubtotal : 1;
        const effectiveLine = item.lineTotal * scale;
        const lineProfit = effectiveLine - item.unitCost * item.quantity;
        const cur = map.get(item.name) ?? {
            name: item.name,
            quantity: 0,
            revenue: 0,
            profit: 0,
        };
        cur.quantity += item.quantity;
        cur.revenue += effectiveLine;
        cur.profit += lineProfit;
        map.set(item.name, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
}
export async function getAdminAnalytics(): Promise<AdminAnalyticsPayload> {
    const todayStart = startOfToday();
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yearStart = daysAgo(364);
    const billWhere = { status: "COMPLETED" as const };
    const [allAgg, allReturnsAgg, periodBills, itemsWithDate, cashierBills, recentBillsRaw, todayP, yesterdayP, weekP, monthP, yearP,] = await Promise.all([
        prisma.bill.aggregate({
            where: billWhere,
            _sum: { total: true },
            _count: true,
        }),
        prisma.return.aggregate({ _sum: { refundAmount: true } }),
        prisma.bill.findMany({
            where: { ...billWhere, createdAt: { gte: yearStart } },
            select: { total: true, createdAt: true },
            orderBy: { createdAt: "asc" },
        }),
        prisma.billItem.findMany({
            where: { bill: { ...billWhere, createdAt: { gte: yearStart } } },
            select: {
                name: true,
                quantity: true,
                lineTotal: true,
                unitCost: true,
                bill: { select: { createdAt: true, subtotal: true, total: true } },
            },
        }),
        prisma.bill.groupBy({
            by: ["cashierId"],
            where: { ...billWhere, createdAt: { gte: daysAgo(29) } },
            _sum: { total: true },
            _count: true,
        }),
        prisma.bill.findMany({
            where: billWhere,
            select: {
                id: true,
                billNumber: true,
                total: true,
                itemCount: true,
                createdAt: true,
                cashier: { select: { fullName: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
        }),
        periodBreakdown(todayStart),
        periodBreakdown(yesterdayStart),
        periodBreakdown(daysAgo(6)),
        periodBreakdown(daysAgo(29)),
        periodBreakdown(yearStart),
    ]);
    const cashiers = await prisma.user.findMany({
        where: { id: { in: cashierBills.map((c) => c.cashierId) } },
        select: { id: true, fullName: true },
    });
    const cashierName = new Map(cashiers.map((c) => [c.id, c.fullName]));
    const flatItems = itemsWithDate.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
        unitCost: i.unitCost,
        createdAt: i.bill.createdAt,
        billSubtotal: i.bill.subtotal,
        billTotal: i.bill.total,
    }));
    const allSales = allAgg._sum.total ?? 0;
    const allRefunds = allReturnsAgg._sum.refundAmount ?? 0;
    const allBills = allAgg._count;
    const allTimeProfit = await profitFromItems(new Date(0));
    return {
        today: todayP,
        yesterday: {
            ...yesterdayP,
            grossSales: Math.max(0, yesterdayP.grossSales - todayP.grossSales),
            discounts: Math.max(0, yesterdayP.discounts - todayP.discounts),
            refunds: Math.max(0, yesterdayP.refunds - todayP.refunds),
            netRevenue: Math.max(0, yesterdayP.netRevenue - todayP.netRevenue),
            bills: Math.max(0, yesterdayP.bills - todayP.bills),
            itemsSold: Math.max(0, yesterdayP.itemsSold - todayP.itemsSold),
            returns: Math.max(0, yesterdayP.returns - todayP.returns),
        },
        periods: {
            day: todayP,
            week: weekP,
            month: monthP,
            year: yearP,
        },
        allTime: {
            sales: allSales,
            bills: allBills,
            netRevenue: allSales - allRefunds,
            grossProfit: allTimeProfit.grossProfit,
            avgBill: allBills > 0 ? allSales / allBills : 0,
            refunds: allRefunds,
        },
        series: {
            day: buildDaySeries(periodBills),
            week: buildWeekSeries(periodBills),
            month: buildMonthSeries(periodBills),
            year: buildYearSeries(periodBills),
        },
        topProductsByPeriod: {
            day: topProductsFromItems(flatItems, todayStart),
            week: topProductsFromItems(flatItems, daysAgo(6)),
            month: topProductsFromItems(flatItems, daysAgo(29)),
            year: topProductsFromItems(flatItems, yearStart),
        },
        topCashiers: cashierBills
            .map((c) => ({
            name: cashierName.get(c.cashierId) ?? "Unknown",
            sales: c._sum.total ?? 0,
            bills: c._count,
        }))
            .sort((a, b) => b.sales - a.sales),
        recentBills: recentBillsRaw.map((b) => ({
            id: b.id,
            billNumber: b.billNumber,
            total: b.total,
            itemCount: b.itemCount,
            cashierName: b.cashier.fullName,
            createdAt: b.createdAt.toISOString(),
        })),
    };
}

