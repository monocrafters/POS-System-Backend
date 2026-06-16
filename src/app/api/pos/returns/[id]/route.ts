import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
import { triggerCloudBackup } from "@/lib/sync/trigger-cloud-backup";

type RouteCtx = {
    params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, ctx: RouteCtx) {
    const admin = await requireAdmin(request);
    if (!admin) return jsonError("Unauthorized", 401);

    const { id } = await ctx.params;
    const record = await prisma.return.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!record) return jsonError("Return not found", 404);

    try {
        await prisma.$transaction(async (tx) => {
            for (const line of record.items) {
                await tx.product.update({
                    where: { id: line.productId },
                    data: { stock: { decrement: line.quantity } },
                });
            }
            await tx.returnItem.deleteMany({ where: { returnId: id } });
            await tx.return.delete({ where: { id } });
        });
        triggerCloudBackup();
        return jsonOk({ success: true, message: "Return deleted" });
    }
    catch (error) {
        console.error("[pos returns DELETE]", error);
        return jsonError("Failed to delete return", 500);
    }
}
