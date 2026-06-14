import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonError, jsonOk } from "@/lib/api-response";
const LOW_STOCK = 5;
export async function GET(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
            barcodes: { take: 1, orderBy: { createdAt: "asc" } },
        },
        orderBy: [{ stock: "asc" }, { name: "asc" }],
    });
    const items = products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        barcode: p.barcodes[0]?.barcode ?? "",
        status: p.stock === 0 ? "out" : p.stock <= LOW_STOCK ? "low" : ("ok" as const),
    }));
    const summary = {
        total: items.length,
        out: items.filter((i) => i.status === "out").length,
        low: items.filter((i) => i.status === "low").length,
        inStock: items.filter((i) => i.status === "ok").length,
    };
    return jsonOk({ success: true, products: items, summary });
}

