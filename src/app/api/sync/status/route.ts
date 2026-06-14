import { getSyncStatus } from "@/lib/sync/sync-service";
import { checkMongoHealthQuick } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonOk, jsonError } from "@/lib/api-response";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";

export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) return jsonError("Unauthorized", 401);
    try {
        await ensureDatabaseReady();
        const [sync, mongo] = await Promise.all([
            getSyncStatus(),
            checkMongoHealthQuick(),
        ]);
        return jsonOk({
            sync: {
                ...sync,
                online: mongo.connected,
            },
            mongo,
            ok: mongo.connected,
            checkedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("[sync/status]", error);
        return jsonError(error instanceof Error ? error.message : "Failed to load sync status", 500);
    }
}
