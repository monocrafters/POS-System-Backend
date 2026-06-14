import { z } from "zod";
import { EXPENSE_CATEGORIES, PAY_FREQUENCIES, type ExpenseCategoryId, type PayFrequencyId, } from "@/lib/expenses";
const categoryIds = EXPENSE_CATEGORIES.map((c) => c.id) as [
    ExpenseCategoryId,
    ...ExpenseCategoryId[]
];
const frequencyIds = PAY_FREQUENCIES.map((f) => f.id) as [
    PayFrequencyId,
    ...PayFrequencyId[]
];
const recurringFrequencyIds = PAY_FREQUENCIES.filter((f) => f.id !== "once").map((f) => f.id) as [
    Exclude<PayFrequencyId, "once">,
    ...Exclude<PayFrequencyId, "once">[]
];
const customCategoryRefine = (data: {
    category: string;
    customCategory?: string | null;
}) => {
    if (data.category !== "other")
        return true;
    return Boolean(data.customCategory?.trim());
};
export const expenseSchema = z
    .object({
    title: z.string().trim().min(1, "Title is required"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    category: z.enum(categoryIds),
    customCategory: z.string().trim().optional().nullable(),
    note: z.string().trim().optional().nullable(),
    expenseDate: z.string().optional(),
    payFrequency: z.enum(frequencyIds).optional(),
})
    .refine(customCategoryRefine, {
    message: "Enter a custom category name for Other",
    path: ["customCategory"],
});
export const recurringExpenseSchema = z
    .object({
    title: z.string().trim().min(1, "Title is required"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    category: z.enum(categoryIds),
    customCategory: z.string().trim().optional().nullable(),
    payFrequency: z.enum(recurringFrequencyIds),
    nextDueDate: z.string().min(1, "Next due date is required"),
    remindDaysBefore: z.coerce.number().int().min(0).max(30).default(3),
    note: z.string().trim().optional().nullable(),
})
    .refine(customCategoryRefine, {
    message: "Enter a custom category name for Other",
    path: ["customCategory"],
});

