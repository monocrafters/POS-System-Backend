import { prisma } from "@/lib/prisma";
import { expenseCategoryLabel, payFrequencyLabel, type PayFrequencyId, } from "@/lib/expenses";
import { advanceDueDate, getDueInfo, shouldShowReminder, type DueInfo, } from "@/lib/expense-schedule";
import { daysAgo, startOfToday } from "@/lib/analytics/cashier-analytics";
export type ExpensePeriod = "day" | "week" | "month" | "year" | "all";
export function expensePeriodStart(period: ExpensePeriod): Date | null {
    if (period === "all")
        return null;
    if (period === "day")
        return startOfToday();
    if (period === "week")
        return daysAgo(6);
    if (period === "month")
        return daysAgo(29);
    return daysAgo(364);
}
export interface ExpenseRecord {
    id: string;
    title: string;
    amount: number;
    category: string;
    categoryLabel: string;
    customCategory: string | null;
    note: string | null;
    expenseDate: string;
    payFrequency: string | null;
    payFrequencyLabel: string | null;
    recurringExpenseId: string | null;
    createdAt: string;
}
export interface RecurringExpenseRecord {
    id: string;
    title: string;
    amount: number;
    category: string;
    categoryLabel: string;
    customCategory: string | null;
    payFrequency: string;
    payFrequencyLabel: string;
    nextDueDate: string;
    remindDaysBefore: number;
    note: string | null;
    isActive: boolean;
    due: DueInfo;
}
export interface ExpensesSummary {
    total: number;
    count: number;
    byCategory: {
        category: string;
        label: string;
        total: number;
        count: number;
    }[];
}
function serializeExpense(e: {
    id: string;
    title: string;
    amount: number;
    category: string;
    customCategory: string | null;
    note: string | null;
    expenseDate: Date;
    createdAt: Date;
    recurringExpenseId: string | null;
    recurringExpense?: {
        payFrequency: string;
    } | null;
}): ExpenseRecord {
    const freq = e.recurringExpense?.payFrequency ?? null;
    return {
        id: e.id,
        title: e.title,
        amount: e.amount,
        category: e.category,
        categoryLabel: expenseCategoryLabel(e.category, e.customCategory),
        customCategory: e.customCategory,
        note: e.note,
        expenseDate: e.expenseDate.toISOString(),
        payFrequency: freq,
        payFrequencyLabel: freq ? payFrequencyLabel(freq) : null,
        recurringExpenseId: e.recurringExpenseId,
        createdAt: e.createdAt.toISOString(),
    };
}
function serializeSchedule(s: {
    id: string;
    title: string;
    amount: number;
    category: string;
    customCategory: string | null;
    payFrequency: string;
    nextDueDate: Date;
    remindDaysBefore: number;
    note: string | null;
    isActive: boolean;
}): RecurringExpenseRecord {
    return {
        id: s.id,
        title: s.title,
        amount: s.amount,
        category: s.category,
        categoryLabel: expenseCategoryLabel(s.category, s.customCategory),
        customCategory: s.customCategory,
        payFrequency: s.payFrequency,
        payFrequencyLabel: payFrequencyLabel(s.payFrequency),
        nextDueDate: s.nextDueDate.toISOString(),
        remindDaysBefore: s.remindDaysBefore,
        note: s.note,
        isActive: s.isActive,
        due: getDueInfo(s.nextDueDate, s.remindDaysBefore),
    };
}
export async function listAdminExpenses(period: ExpensePeriod) {
    const since = expensePeriodStart(period);
    const where = since ? { expenseDate: { gte: since } } : {};
    const [rows, schedules] = await Promise.all([
        prisma.expense.findMany({
            where,
            include: { recurringExpense: { select: { payFrequency: true } } },
            orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
        }),
        prisma.recurringExpense.findMany({
            where: { isActive: true },
            orderBy: { nextDueDate: "asc" },
        }),
    ]);
    const expenses = rows.map(serializeExpense);
    const recurring = schedules.map(serializeSchedule);
    const reminders = recurring.filter((r) => shouldShowReminder(r.due));
    const byCat = new Map<string, {
        total: number;
        count: number;
    }>();
    for (const e of expenses) {
        const key = e.categoryLabel;
        const cur = byCat.get(key) ?? { total: 0, count: 0 };
        cur.total += e.amount;
        cur.count += 1;
        byCat.set(key, cur);
    }
    const summary: ExpensesSummary = {
        total: expenses.reduce((s, e) => s + e.amount, 0),
        count: expenses.length,
        byCategory: [...byCat.entries()]
            .map(([label, v]) => ({
            category: label,
            label,
            total: v.total,
            count: v.count,
        }))
            .sort((a, b) => b.total - a.total),
    };
    return { expenses, summary, recurring, reminders };
}
export async function createExpense(input: {
    title: string;
    amount: number;
    category: string;
    customCategory?: string | null;
    note?: string | null;
    expenseDate?: string;
    payFrequency?: PayFrequencyId;
    nextDueDate?: string;
    remindDaysBefore?: number;
}) {
    const expenseDate = input.expenseDate
        ? new Date(input.expenseDate)
        : new Date();
    const freq = input.payFrequency ?? "once";
    if (freq !== "once" && input.nextDueDate) {
        const schedule = await prisma.recurringExpense.create({
            data: {
                title: input.title,
                amount: input.amount,
                category: input.category,
                customCategory: input.customCategory ?? null,
                payFrequency: freq,
                nextDueDate: new Date(input.nextDueDate),
                remindDaysBefore: input.remindDaysBefore ?? 3,
                note: input.note ?? null,
            },
        });
        return { expense: null, schedule: serializeSchedule(schedule) };
    }
    const row = await prisma.expense.create({
        data: {
            title: input.title,
            amount: input.amount,
            category: input.category,
            customCategory: input.customCategory ?? null,
            note: input.note ?? null,
            expenseDate,
        },
        include: { recurringExpense: { select: { payFrequency: true } } },
    });
    return { expense: serializeExpense(row), schedule: null };
}
export async function createRecurringExpense(input: {
    title: string;
    amount: number;
    category: string;
    customCategory?: string | null;
    payFrequency: PayFrequencyId;
    nextDueDate: string;
    remindDaysBefore?: number;
    note?: string | null;
}) {
    const row = await prisma.recurringExpense.create({
        data: {
            title: input.title,
            amount: input.amount,
            category: input.category,
            customCategory: input.customCategory ?? null,
            payFrequency: input.payFrequency,
            nextDueDate: new Date(input.nextDueDate),
            remindDaysBefore: input.remindDaysBefore ?? 3,
            note: input.note ?? null,
        },
    });
    return serializeSchedule(row);
}
export async function updateRecurringExpense(id: string, input: {
    title: string;
    amount: number;
    category: string;
    customCategory?: string | null;
    payFrequency: PayFrequencyId;
    nextDueDate: string;
    remindDaysBefore?: number;
    note?: string | null;
}) {
    const row = await prisma.recurringExpense.update({
        where: { id },
        data: {
            title: input.title,
            amount: input.amount,
            category: input.category,
            customCategory: input.customCategory ?? null,
            payFrequency: input.payFrequency,
            nextDueDate: new Date(input.nextDueDate),
            remindDaysBefore: input.remindDaysBefore ?? 3,
            note: input.note ?? null,
        },
    });
    return serializeSchedule(row);
}
export async function markRecurringPaid(id: string, input?: {
    amount?: number;
    expenseDate?: string;
}) {
    const schedule = await prisma.recurringExpense.findUnique({ where: { id } });
    if (!schedule)
        throw new Error("Schedule not found");
    const amount = input?.amount ?? schedule.amount;
    const expenseDate = input?.expenseDate
        ? new Date(input.expenseDate)
        : new Date();
    const nextDue = advanceDueDate(schedule.nextDueDate, schedule.payFrequency as PayFrequencyId);
    const payment = await prisma.expense.create({
        data: {
            title: schedule.title,
            amount,
            category: schedule.category,
            customCategory: schedule.customCategory,
            note: schedule.note,
            expenseDate,
            recurringExpenseId: schedule.id,
        },
        include: { recurringExpense: { select: { payFrequency: true } } },
    });
    const updated = await prisma.recurringExpense.update({
        where: { id },
        data: { nextDueDate: nextDue, amount },
    });
    return {
        expense: serializeExpense(payment),
        schedule: serializeSchedule(updated),
    };
}
export async function updateExpense(id: string, input: {
    title: string;
    amount: number;
    category: string;
    customCategory?: string | null;
    note?: string | null;
    expenseDate?: string;
}) {
    const row = await prisma.expense.update({
        where: { id },
        data: {
            title: input.title,
            amount: input.amount,
            category: input.category,
            customCategory: input.customCategory ?? null,
            note: input.note ?? null,
            expenseDate: input.expenseDate
                ? new Date(input.expenseDate)
                : undefined,
        },
        include: { recurringExpense: { select: { payFrequency: true } } },
    });
    return serializeExpense(row);
}
export async function deleteExpense(id: string) {
    await prisma.expense.delete({ where: { id } });
}
export async function deleteRecurringExpense(id: string) {
    await prisma.recurringExpense.update({
        where: { id },
        data: { isActive: false },
    });
}

