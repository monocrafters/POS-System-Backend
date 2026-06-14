import { getAdminAnalytics } from "@/lib/analytics/admin-analytics";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const analytics = await getAdminAnalytics();
        return jsonOk({ success: true, analytics });
    }
    catch (error) {
        console.error("[admin analytics]", error);
        return jsonError("Failed to load analytics", 500);
    }
}

