import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
import { deleteExpense, updateExpense } from "@/lib/admin-expenses";
import { expenseSchema } from "@/lib/validations/expense";
type Params = {
    params: Promise<{
        id: string;
    }>;
};
export async function PATCH(request: Request, { params }: Params) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const { id } = await params;
    try {
        const body = await request.json();
        const parsed = expenseSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const expense = await updateExpense(id, parsed.data);
        return jsonOk({ success: true, expense });
    }
    catch (error) {
        console.error("[admin expenses PATCH]", error);
        return jsonError("Failed to update expense", 500);
    }
}
export async function DELETE(request: Request, { params }: Params) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const { id } = await params;
    try {
        await deleteExpense(id);
        return jsonOk({ success: true });
    }
    catch (error) {
        console.error("[admin expenses DELETE]", error);
        return jsonError("Failed to delete expense", 500);
    }
}

