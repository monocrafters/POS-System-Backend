import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
import { markRecurringPaid } from "@/lib/admin-expenses";
type Params = {
    params: Promise<{
        id: string;
    }>;
};
export async function POST(request: Request, { params }: Params) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const { id } = await params;
    try {
        const body = await request.json().catch(() => ({}));
        const result = await markRecurringPaid(id, {
            amount: typeof body.amount === "number"
                ? body.amount
                : body.amount != null
                    ? Number(body.amount)
                    : undefined,
            expenseDate: body.expenseDate,
        });
        return jsonOk({ success: true, ...result });
    }
    catch (error) {
        console.error("[expense mark-paid]", error);
        return jsonError("Failed to record payment", 500);
    }
}

