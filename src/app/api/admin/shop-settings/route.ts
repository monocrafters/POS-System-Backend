import { getShopSettings, updateShopSettings } from "@/lib/shop-settings";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
import { shopSettingsSchema } from "@/lib/validations/shop";
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const settings = await getShopSettings();
    return jsonOk({ success: true, settings });
}
export async function PATCH(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const body = await request.json();
        const parsed = shopSettingsSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const settings = await updateShopSettings(parsed.data);
        return jsonOk({ success: true, settings });
    }
    catch (error) {
        console.error("[shop-settings PATCH]", error);
        return jsonError("Failed to save settings", 500);
    }
}

