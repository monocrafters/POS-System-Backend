import { getAdminStockAnalytics } from "@/lib/analytics/admin-stock-analytics";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        await ensureDatabaseReady();
        const data = await getAdminStockAnalytics();
        return jsonOk({ success: true, ...data });
    }
    catch (error) {
        console.error("[admin stock-analytics]", error);
        return jsonError("Failed to load stock analytics", 500);
    }
}

