import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const code = new URL(request.url).searchParams.get("code")?.trim();
    if (!code)
        return jsonError("Barcode required", 400);
    const row = await prisma.productBarcode.findUnique({
        where: { barcode: code },
        include: {
            product: {
                include: { barcodes: { orderBy: { createdAt: "asc" } } },
            },
        },
    });
    if (!row || !row.product.isActive) {
        return jsonOk({ success: true, found: false, product: null });
    }
    return jsonOk({
        success: true,
        found: true,
        product: row.product,
    });
}

