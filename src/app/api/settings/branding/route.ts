import { getShopBranding } from "@/lib/shop-settings";
import { jsonOk, jsonError } from "@/lib/api-response";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await ensureDatabaseReady();
        const branding = await getShopBranding();
        return jsonOk({ success: true, branding });
    }
    catch (error) {
        console.error("[branding]", error);
        return jsonError(error instanceof Error ? error.message : "Failed to load branding", 500);
    }
}

