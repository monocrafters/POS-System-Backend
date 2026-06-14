import { getReceiptSettings, updateReceiptSettings } from "@/lib/shop-settings";
import { requireAdmin } from "@/lib/auth/require-admin";
import { receiptSettingsSchema } from "@/lib/validations/receipt";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const settings = await getReceiptSettings();
    return jsonOk({ success: true, settings });
}
export async function PATCH(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const body = await request.json();
        const parsed = receiptSettingsSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const settings = await updateReceiptSettings(parsed.data);
        return jsonOk({ success: true, settings });
    }
    catch (error) {
        console.error("[receipt-settings PATCH]", error);
        return jsonError("Failed to update settings", 500);
    }
}

