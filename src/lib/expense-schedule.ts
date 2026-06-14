import type { PayFrequencyId } from "@/lib/expenses";
import { startOfToday } from "@/lib/analytics/cashier-analytics";
export type DueStatus = "overdue" | "due_soon" | "upcoming" | "ok";
export interface DueInfo {
    status: DueStatus;
    daysUntil: number;
    label: string;
}
function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}
export function advanceDueDate(from: Date, frequency: PayFrequencyId): Date {
    const d = startOfDay(from);
    const day = d.getDate();
    switch (frequency) {
        case "weekly":
            d.setDate(d.getDate() + 7);
            break;
        case "biweekly":
            d.setDate(d.getDate() + 14);
            break;
        case "monthly": {
            const m = d.getMonth() + 1;
            const y = d.getFullYear() + Math.floor(m / 12);
            const nm = m % 12;
            d.setFullYear(y, nm, Math.min(day, daysInMonth(y, nm)));
            break;
        }
        case "quarterly": {
            d.setMonth(d.getMonth() + 3);
            const y = d.getFullYear();
            const m = d.getMonth();
            d.setDate(Math.min(day, daysInMonth(y, m)));
            break;
        }
        case "yearly":
            d.setFullYear(d.getFullYear() + 1);
            break;
        default:
            return d;
    }
    return d;
}
export function getDueInfo(nextDueDate: Date, remindDaysBefore: number): DueInfo {
    const today = startOfToday();
    const due = startOfDay(nextDueDate);
    const daysUntil = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (daysUntil < 0) {
        const n = Math.abs(daysUntil);
        return {
            status: "overdue",
            daysUntil,
            label: n === 1 ? "Overdue by 1 day" : `Overdue by ${n} days`,
        };
    }
    if (daysUntil === 0) {
        return { status: "due_soon", daysUntil, label: "Due today" };
    }
    if (daysUntil <= remindDaysBefore) {
        return {
            status: "due_soon",
            daysUntil,
            label: daysUntil === 1 ? "Due tomorrow" : `Due in ${daysUntil} days`,
        };
    }
    if (daysUntil <= 14) {
        return {
            status: "upcoming",
            daysUntil,
            label: `Due in ${daysUntil} days`,
        };
    }
    return {
        status: "ok",
        daysUntil,
        label: `Due in ${daysUntil} days`,
    };
}
export function shouldShowReminder(due: DueInfo) {
    return due.status === "overdue" || due.status === "due_soon";
}

