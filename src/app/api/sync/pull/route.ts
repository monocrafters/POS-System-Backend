import { requireAdmin } from "@/lib/auth/require-admin";
import { runInitialPullFromMongo } from "@/lib/sync/sync-service";
import { jsonError, jsonOk } from "@/lib/api-response";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const result = await runInitialPullFromMongo();
        if (!result.success && !result.skipped) {
            return jsonError(result.error ?? "Fetch from cloud failed", 500);
        }
        return jsonOk(result);
    }
    catch (error) {
        console.error("[sync/pull]", error);
        return jsonError(error instanceof Error ? error.message : "Fetch from cloud failed", 500);
    }
}
