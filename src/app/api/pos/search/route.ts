import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) {
        return jsonOk({ success: true, products: [] });
    }
    const products = await prisma.product.findMany({
        where: {
            isActive: true,
            stock: { gt: 0 },
            OR: [
                { name: { contains: q } },
                { barcodes: { some: { barcode: { contains: q } } } },
            ],
        },
        include: {
            barcodes: { take: 1, orderBy: { createdAt: "asc" } },
        },
        take: 12,
        orderBy: { name: "asc" },
    });
    const results = products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        barcode: p.barcodes[0]?.barcode ?? "",
    }));
    return jsonOk({ success: true, products: results });
}

