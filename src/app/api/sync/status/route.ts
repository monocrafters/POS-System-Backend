import { getSyncStatus } from "@/lib/sync/sync-service";
import { checkMongoHealth } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) return jsonError("Unauthorized", 401);
    const [sync, mongo] = await Promise.all([
        getSyncStatus(),
        checkMongoHealth(),
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
