import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
import { createExpense, listAdminExpenses, type ExpensePeriod, } from "@/lib/admin-expenses";
import { expenseSchema } from "@/lib/validations/expense";
const PERIODS = new Set<ExpensePeriod>(["day", "week", "month", "year", "all"]);
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const period = (new URL(request.url).searchParams.get("period") ??
        "month") as ExpensePeriod;
    if (!PERIODS.has(period)) {
        return jsonError("Invalid period", 400);
    }
    try {
        const data = await listAdminExpenses(period);
        return jsonOk({ success: true, period, ...data });
    }
    catch (error) {
        console.error("[admin expenses GET]", error);
        return jsonError("Failed to load expenses", 500);
    }
}
export async function POST(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const body = await request.json();
        const parsed = expenseSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const result = await createExpense(parsed.data);
        return jsonOk({ success: true, ...result }, 201);
    }
    catch (error) {
        console.error("[admin expenses POST]", error);
        return jsonError("Failed to add expense", 500);
    }
}

