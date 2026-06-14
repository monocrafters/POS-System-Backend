export const EXPENSE_CATEGORIES = [
    { id: "rent", label: "Rent", defaultFrequency: "monthly" as const },
    { id: "salary", label: "Salary & wages", defaultFrequency: "monthly" as const },
    { id: "utilities", label: "Utilities", defaultFrequency: "monthly" as const },
    { id: "stock", label: "Stock purchase", defaultFrequency: "once" as const },
    { id: "transport", label: "Transport", defaultFrequency: "once" as const },
    { id: "marketing", label: "Marketing", defaultFrequency: "once" as const },
    { id: "other", label: "Other (custom name)", defaultFrequency: "monthly" as const },
] as const;
export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]["id"];
export const PAY_FREQUENCIES = [
    { id: "once", label: "One-time (no repeat)" },
    { id: "weekly", label: "Every week" },
    { id: "biweekly", label: "Every 2 weeks" },
    { id: "monthly", label: "Every month" },
    { id: "quarterly", label: "Every 3 months (quarterly)" },
    { id: "yearly", label: "Every year" },
] as const;
export type PayFrequencyId = (typeof PAY_FREQUENCIES)[number]["id"];
export function expenseCategoryLabel(category: string, customCategory?: string | null) {
    if (category === "other" && customCategory?.trim()) {
        return customCategory.trim();
    }
    return EXPENSE_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}
export function payFrequencyLabel(id: string) {
    return PAY_FREQUENCIES.find((f) => f.id === id)?.label ?? id;
}
export function defaultFrequencyForCategory(category: string): PayFrequencyId {
    const cat = EXPENSE_CATEGORIES.find((c) => c.id === category);
    return (cat?.defaultFrequency ?? "monthly") as PayFrequencyId;
}

