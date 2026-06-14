import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
import { createRecurringExpense } from "@/lib/admin-expenses";
import { recurringExpenseSchema } from "@/lib/validations/expense";
export async function POST(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const body = await request.json();
        const parsed = recurringExpenseSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const schedule = await createRecurringExpense(parsed.data);
        return jsonOk({ success: true, schedule }, 201);
    }
    catch (error) {
        console.error("[expense schedules POST]", error);
        return jsonError("Failed to create schedule", 500);
    }
}

