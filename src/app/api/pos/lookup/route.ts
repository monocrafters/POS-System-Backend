import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const code = new URL(request.url).searchParams.get("code")?.trim();
    if (!code)
        return jsonError("Barcode required", 400);
    const row = await prisma.productBarcode.findUnique({
        where: { barcode: code },
        include: { product: true },
    });
    if (!row || !row.product.isActive) {
        return jsonOk({ success: true, found: false, product: null });
    }
    const p = row.product;
    return jsonOk({
        success: true,
        found: true,
        product: {
            id: p.id,
            name: p.name,
            price: p.price,
            stock: p.stock,
            barcode: row.barcode,
        },
    });
}

