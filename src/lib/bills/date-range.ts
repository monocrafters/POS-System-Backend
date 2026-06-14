export type BillPeriod = "day" | "week" | "month" | "year";
export function periodStart(period: BillPeriod): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period === "day")
        return d;
    if (period === "week") {
        d.setDate(d.getDate() - 6);
        return d;
    }
    if (period === "month") {
        d.setDate(d.getDate() - 29);
        return d;
    }
    d.setFullYear(d.getFullYear() - 1);
    return d;
}

