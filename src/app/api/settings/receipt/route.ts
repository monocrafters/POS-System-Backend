import { getReceiptSettings } from "@/lib/shop-settings";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const settings = await getReceiptSettings();
    return jsonOk({ success: true, settings });
}

