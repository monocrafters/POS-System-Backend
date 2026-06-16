import { runFullSync } from "@/lib/sync/sync-service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonOk, jsonError } from "@/lib/api-response";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        await ensureDatabaseReady();
        const result = await runFullSync();
        if (!result.success && !result.skipped) {
            return jsonError(result.error ?? "Sync failed", 500);
        }
        return jsonOk(result);
    }
    catch (error) {
        console.error("[sync/run]", error);
        return jsonError(error instanceof Error ? error.message : "Sync failed", 500);
    }
}
export async function GET(request: Request) {
    return POST(request);
}
