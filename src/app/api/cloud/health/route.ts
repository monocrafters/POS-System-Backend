import { checkCloudHealth } from "@/lib/supabase-cloud";
import { jsonOk } from "@/lib/api-response";

export async function GET() {
    const health = await checkCloudHealth();
    return jsonOk({
        success: health.connected,
        ...health,
        checkedAt: new Date().toISOString(),
    });
}
