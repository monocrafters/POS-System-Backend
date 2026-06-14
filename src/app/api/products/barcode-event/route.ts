import { pushBarcodeScan, consumeBarcodeScan } from "@/lib/scan-events";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function POST(request: Request) {
    try {
        const text = await request.text();
        const body = text.trim() ? (JSON.parse(text) as {
            barcode?: unknown;
        }) : {};
        const barcode = String(body?.barcode ?? "").trim();
        if (!barcode)
            return jsonError("Barcode required", 400);
        pushBarcodeScan(barcode);
        return jsonOk({ success: true, barcode });
    }
    catch {
        return jsonError("Invalid body", 400);
    }
}
export async function GET() {
    const barcode = consumeBarcodeScan();
    return jsonOk({ success: true, barcode: barcode ?? null });
}

