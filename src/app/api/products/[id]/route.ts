import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { productSchema } from "@/lib/validations/product";
import { jsonError, jsonOk } from "@/lib/api-response";

function triggerCloudBackup() {
    import("@/lib/sync/sync-service")
        .then(({ runFullSync }) => runFullSync())
        .catch((err) => console.error("[products cloud-backup]", err));
}
const productInclude = {
    barcodes: { orderBy: { createdAt: "asc" as const } },
};
type RouteCtx = {
    params: Promise<{
        id: string;
    }>;
};
export async function PATCH(request: Request, ctx: RouteCtx) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const { id } = await ctx.params;
    try {
        const body = await request.json();
        const parsed = productSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const existing = await prisma.product.findUnique({
            where: { id },
            include: { barcodes: true },
        });
        if (!existing || !existing.isActive) {
            return jsonError("Product not found", 404);
        }
        const { name, price, purchaseCost = 0, stock, barcodes } = parsed.data;
        const unique = [...new Set(barcodes.map((b) => b.trim()).filter(Boolean))];
        const clash = await prisma.productBarcode.findFirst({
            where: {
                barcode: { in: unique },
                productId: { not: id },
                product: { isActive: true },
            },
        });
        if (clash) {
            return jsonError(`Barcode already used: ${clash.barcode}`, 409);
        }
        await prisma.$transaction([
            prisma.productBarcode.deleteMany({ where: { productId: id } }),
            prisma.product.update({
                where: { id },
                data: {
                    name,
                    price,
                    purchaseCost,
                    stock,
                    barcodes: { create: unique.map((barcode) => ({ barcode })) },
                },
            }),
        ]);
        const product = await prisma.product.findUnique({
            where: { id },
            include: productInclude,
        });
        triggerCloudBackup();
        return jsonOk({ success: true, product });
    }
    catch (error) {
        console.error("[products PATCH]", error);
        return jsonError("Failed to update product", 500);
    }
}
export async function DELETE(request: Request, ctx: RouteCtx) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const { id } = await ctx.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
        return jsonError("Product not found", 404);
    }
    await prisma.$transaction([
        prisma.productBarcode.deleteMany({ where: { productId: id } }),
        prisma.product.update({
            where: { id },
            data: { isActive: false },
        }),
    ]);
    triggerCloudBackup();
    return jsonOk({ success: true, message: "Product removed" });
}

