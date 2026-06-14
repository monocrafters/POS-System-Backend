import { getShopBranding } from "@/lib/shop-settings";
import { jsonOk } from "@/lib/api-response";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";
export async function GET() {
    await ensureDatabaseReady();
    const branding = await getShopBranding();
    return jsonOk({ success: true, branding });
}

