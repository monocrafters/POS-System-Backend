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
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: productInclude,
            orderBy: { updatedAt: "desc" },
        });
        return jsonOk({ success: true, products });
    }
    catch (error) {
        console.error("[products GET]", error);
        return jsonError("Failed to load products", 500);
    }
}
export async function POST(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const body = await request.json();
        const parsed = productSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const { name, price, purchaseCost = 0, stock, barcodes } = parsed.data;
        const unique = [...new Set(barcodes.map((b) => b.trim()).filter(Boolean))];
        const clash = await prisma.productBarcode.findFirst({
            where: {
                barcode: { in: unique },
                product: { isActive: true },
            },
        });
        if (clash) {
            return jsonError(`Barcode already used: ${clash.barcode}`, 409);
        }
        const product = await prisma.product.create({
            data: {
                name,
                price,
                purchaseCost,
                stock,
                barcodes: {
                    create: unique.map((barcode) => ({ barcode })),
                },
            },
            include: productInclude,
        });
        triggerCloudBackup();
        return jsonOk({ success: true, product }, 201);
    }
    catch (error) {
        console.error("[products POST]", error);
        const msg = error instanceof Error ? error.message : "Failed to create product";
        if (msg.includes("Unknown argument") || msg.includes("purchaseCost")) {
            return jsonError("Database out of date. Stop the app, run `npm run db:push`, then restart.", 500);
        }
        if (msg.includes("Unique constraint")) {
            return jsonError("Barcode already exists on another product", 409);
        }
        return jsonError(msg.includes("prisma") ? "Failed to create product. Restart the app and try again." : msg, 500);
    }
}

