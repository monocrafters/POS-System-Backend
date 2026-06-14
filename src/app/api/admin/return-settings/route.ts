import { getReturnSettings, updateReturnSettings } from "@/lib/shop-settings";
import { requireAdmin } from "@/lib/auth/require-admin";
import { returnSettingsSchema } from "@/lib/validations/return";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const settings = await getReturnSettings();
    return jsonOk({ success: true, settings });
}
export async function PATCH(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const body = await request.json();
        const parsed = returnSettingsSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const settings = await updateReturnSettings(parsed.data);
        return jsonOk({ success: true, settings });
    }
    catch (error) {
        console.error("[return-settings PATCH]", error);
        return jsonError("Failed to update settings", 500);
    }
}

