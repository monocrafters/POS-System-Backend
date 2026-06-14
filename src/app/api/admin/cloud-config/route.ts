import { requireAdmin } from "@/lib/auth/require-admin";
import { disconnectMongo, checkMongoHealth } from "@/lib/mongodb";
import { readCloudConfig, saveCloudConfig, removeCloudConfig, maskMongoUri } from "@/lib/cloud-config";
import { jsonError, jsonOk } from "@/lib/api-response";
import { z } from "zod";

const saveSchema = z.object({
    mongodbUri: z.string().min(10, "Enter a valid MongoDB connection string"),
    shopId: z.string().min(1).max(80).optional(),
    syncEnabled: z.boolean().optional(),
});

export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) return jsonError("Unauthorized", 401);
    const config = readCloudConfig();
    const health = await checkMongoHealth().catch(() => null);
    return jsonOk({
        success: true,
        config: {
            configured: Boolean(config.mongodbUri && config.syncEnabled),
            mongodbUriMasked: maskMongoUri(config.mongodbUri),
            shopId: config.shopId,
            syncEnabled: config.syncEnabled,
            connected: health?.connected ?? false,
            connectionMessage: health?.message ?? null,
            database: health?.database ?? null,
        },
    });
}

export async function PUT(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) return jsonError("Unauthorized", 401);
    try {
        const body = await request.json();
        const parsed = saveSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid cloud settings", 400);
        }
        await disconnectMongo();
        const saved = saveCloudConfig(parsed.data);
        const health = await checkMongoHealth();
        import("@/lib/sync/sync-service")
            .then(({ runFullSync }) => runFullSync())
            .catch((err) => console.error("[cloud-config backup]", err));
        return jsonOk({
            success: true,
            config: {
                configured: Boolean(saved.mongodbUri && saved.syncEnabled),
                mongodbUriMasked: maskMongoUri(saved.mongodbUri),
                shopId: saved.shopId,
                syncEnabled: saved.syncEnabled,
                connected: health.connected,
                connectionMessage: health.message,
                database: health.database,
            },
        });
    }
    catch (error) {
        console.error("[cloud-config PUT]", error);
        return jsonError(error instanceof Error ? error.message : "Failed to save cloud settings", 500);
    }
}

export async function DELETE(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) return jsonError("Unauthorized", 401);
    try {
        await disconnectMongo();
        const saved = removeCloudConfig();
        return jsonOk({
            success: true,
            message: "Cloud database removed. Local SQLite data is unchanged.",
            config: {
                configured: false,
                mongodbUriMasked: null,
                shopId: saved.shopId,
                syncEnabled: false,
                connected: false,
            },
        });
    }
    catch (error) {
        console.error("[cloud-config DELETE]", error);
        return jsonError(error instanceof Error ? error.message : "Failed to remove cloud settings", 500);
    }
}
