function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
}
function dateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}
export interface ChartPoint {
    date: string;
    label: string;
    sales: number;
    bills: number;
}
export function buildDaySeries(bills: {
    total: number;
    createdAt: Date;
}[]): ChartPoint[] {
    const today = startOfToday();
    const buckets: ChartPoint[] = [];
    for (let h = 8; h <= 22; h++) {
        const label = h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`;
        buckets.push({
            date: `${h}`,
            label,
            sales: 0,
            bills: 0,
        });
    }
    for (const b of bills) {
        if (b.createdAt < today)
            continue;
        const h = b.createdAt.getHours();
        if (h < 8 || h > 22)
            continue;
        const idx = h - 8;
        buckets[idx].sales += b.total;
        buckets[idx].bills += 1;
    }
    return buckets;
}
export function buildWeekSeries(bills: {
    total: number;
    createdAt: Date;
}[]): ChartPoint[] {
    const dayMap = new Map<string, {
        sales: number;
        bills: number;
    }>();
    for (let i = 6; i >= 0; i--) {
        dayMap.set(dateKey(daysAgo(i)), { sales: 0, bills: 0 });
    }
    const weekStart = daysAgo(6);
    for (const b of bills) {
        if (b.createdAt < weekStart)
            continue;
        const key = dateKey(b.createdAt);
        const row = dayMap.get(key);
        if (row) {
            row.sales += b.total;
            row.bills += 1;
        }
    }
    return Array.from(dayMap.entries()).map(([date, row]) => {
        const d = new Date(date + "T12:00:00");
        return {
            date,
            label: d.toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
            }),
            sales: row.sales,
            bills: row.bills,
        };
    });
}
export function buildMonthSeries(bills: {
    total: number;
    createdAt: Date;
}[]): ChartPoint[] {
    const dayMap = new Map<string, {
        sales: number;
        bills: number;
    }>();
    for (let i = 29; i >= 0; i--) {
        dayMap.set(dateKey(daysAgo(i)), { sales: 0, bills: 0 });
    }
    const monthStart = daysAgo(29);
    for (const b of bills) {
        if (b.createdAt < monthStart)
            continue;
        const key = dateKey(b.createdAt);
        const row = dayMap.get(key);
        if (row) {
            row.sales += b.total;
            row.bills += 1;
        }
    }
    return Array.from(dayMap.entries()).map(([date, row]) => {
        const d = new Date(date + "T12:00:00");
        return {
            date,
            label: String(d.getDate()),
            sales: row.sales,
            bills: row.bills,
        };
    });
}
export function buildYearSeries(bills: {
    total: number;
    createdAt: Date;
}[]): ChartPoint[] {
    const now = new Date();
    const buckets: ChartPoint[] = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.push({
            date: key,
            label: d.toLocaleDateString(undefined, { month: "short" }),
            sales: 0,
            bills: 0,
        });
    }
    const yearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    for (const b of bills) {
        if (b.createdAt < yearStart)
            continue;
        const key = `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}`;
        const row = buckets.find((x) => x.date === key);
        if (row) {
            row.sales += b.total;
            row.bills += 1;
        }
    }
    return buckets;
}
export function sumSeries(points: ChartPoint[]) {
    return {
        sales: points.reduce((s, p) => s + p.sales, 0),
        bills: points.reduce((s, p) => s + p.bills, 0),
    };
}

