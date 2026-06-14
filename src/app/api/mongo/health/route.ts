import { checkMongoHealth } from "@/lib/mongodb";
import { jsonOk } from "@/lib/api-response";
export async function GET() {
    const health = await checkMongoHealth();
    return jsonOk({
        success: health.connected,
        ...health,
        checkedAt: new Date().toISOString(),
    });
}

