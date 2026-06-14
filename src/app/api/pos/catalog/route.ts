import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
            barcodes: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { name: "asc" },
    });
    const catalog = products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        barcodes: p.barcodes.map((b) => b.barcode),
        barcode: p.barcodes[0]?.barcode ?? "",
    }));
    return jsonOk({ success: true, products: catalog });
}

