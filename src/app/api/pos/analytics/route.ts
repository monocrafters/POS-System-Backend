import { requireAuth } from "@/lib/auth/require-auth";
import { getCashierAnalytics } from "@/lib/analytics/cashier-analytics";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const cashierId = user.role === "CASHIER" ? user.sub : new URL(request.url).searchParams.get("cashierId");
    if (!cashierId) {
        return jsonError("cashierId required for admin", 400);
    }
    try {
        const analytics = await getCashierAnalytics(cashierId);
        return jsonOk({ success: true, analytics });
    }
    catch (error) {
        console.error("[pos analytics]", error);
        return jsonError("Failed to load analytics", 500);
    }
}

