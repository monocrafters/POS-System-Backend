import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
import { deleteRecurringExpense, updateRecurringExpense, } from "@/lib/admin-expenses";
import { recurringExpenseSchema } from "@/lib/validations/expense";
import { triggerCloudBackup } from "@/lib/sync/trigger-cloud-backup";
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
        const parsed = recurringExpenseSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const schedule = await updateRecurringExpense(id, parsed.data);
        triggerCloudBackup();
        return jsonOk({ success: true, schedule });
    }
    catch (error) {
        console.error("[expense schedule PATCH]", error);
        return jsonError("Failed to update schedule", 500);
    }
}
export async function DELETE(request: Request, { params }: Params) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const { id } = await params;
    try {
        await deleteRecurringExpense(id);
        triggerCloudBackup();
        return jsonOk({ success: true });
    }
    catch (error) {
        console.error("[expense schedule DELETE]", error);
        return jsonError("Failed to remove schedule", 500);
    }
}

