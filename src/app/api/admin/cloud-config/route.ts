import { requireAdmin } from "@/lib/auth/require-admin";
import { readCloudConfig, isCloudConfigured, maskPostgresUri } from "@/lib/cloud-config";
import { checkCloudHealth } from "@/lib/supabase-cloud";
import { jsonOk, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cloud sync status — credentials come from server .env only (no user setup). */
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) return jsonError("Unauthorized", 401);
    const config = readCloudConfig();
    const health = isCloudConfigured()
        ? await checkCloudHealth().catch(() => null)
        : null;
    return jsonOk({
        success: true,
        config: {
            configured: isCloudConfigured(),
            provider: "supabase",
            postgresUriMasked: maskPostgresUri(config.postgresUri),
            shopId: config.shopId,
            syncEnabled: config.syncEnabled,
            connected: health?.connected ?? false,
            connectionMessage: health?.message ?? null,
            database: health?.database ?? null,
        },
    });
}
