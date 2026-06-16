import { getSyncStatus } from "@/lib/sync/sync-service";
import { checkCloudHealth } from "@/lib/supabase-cloud";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonOk, jsonError } from "@/lib/api-response";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";
import { isCloudConfigured } from "@/lib/cloud-config";

export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) return jsonError("Unauthorized", 401);
    try {
        await ensureDatabaseReady();
        const [sync, cloud] = await Promise.all([
            getSyncStatus(),
            isCloudConfigured()
                ? checkCloudHealth().catch(() => ({
                    configured: true,
                    connected: false,
                    message: "Cloud check failed",
                    database: null,
                    shopId: null,
                    latencyMs: null,
                }))
                : Promise.resolve({
                    configured: false,
                    connected: false,
                    message: "Cloud not configured on server",
                    database: null,
                    shopId: null,
                    latencyMs: null,
                }),
        ]);
        return jsonOk({
            sync: {
                ...sync,
                online: cloud.connected,
            },
            cloud,
            ok: cloud.connected,
            checkedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("[sync/status]", error);
        return jsonError(error instanceof Error ? error.message : "Failed to load sync status", 500);
    }
}
