import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { getReturnableQty } from "@/lib/returns/bill-returnable";
import { getEffectiveUnitPrice } from "@/lib/returns/refund-pricing";
import { getReturnSettings } from "@/lib/shop-settings";
import { jsonError, jsonOk } from "@/lib/api-response";
const billInclude = {
    items: {
        include: { returnItems: true },
        orderBy: { id: "asc" as const },
    },
    cashier: {
        select: { id: true, fullName: true, username: true },
    },
    returns: {
        include: { items: true },
        orderBy: { createdAt: "desc" as const },
    },
};
export async function GET(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const billNumber = new URL(request.url).searchParams
        .get("billNumber")
        ?.trim();
    if (!billNumber)
        return jsonError("Bill ID required", 400);
    const settings = await getReturnSettings();
    if (!settings.returnsEnabled) {
        return jsonError("Returns are disabled by admin", 403);
    }
    const bill = await prisma.bill.findUnique({
        where: { billNumber },
        include: billInclude,
    });
    if (!bill || bill.status !== "COMPLETED") {
        return jsonOk({ success: true, found: false, bill: null });
    }
    if (user.role === "CASHIER" && bill.cashierId !== user.sub) {
        return jsonError("This bill belongs to another cashier", 403);
    }
    const items = bill.items.map((item) => {
        const effectiveUnitPrice = getEffectiveUnitPrice(item, bill);
        return {
            id: item.id,
            productId: item.productId,
            barcode: item.barcode,
            name: item.name,
            unitPrice: item.unitPrice,
            effectiveUnitPrice,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            returnedQty: item.returnItems.reduce((s, r) => s + r.quantity, 0),
            returnableQty: getReturnableQty(item),
        };
    });
    const hasReturnable = items.some((i) => i.returnableQty > 0);
    return jsonOk({
        success: true,
        found: true,
        bill: {
            id: bill.id,
            billNumber: bill.billNumber,
            subtotal: bill.subtotal,
            discountAmount: bill.discountAmount,
            total: bill.total,
            itemCount: bill.itemCount,
            createdAt: bill.createdAt,
            cashier: bill.cashier,
            items,
            hasReturnable,
            refundPercent: settings.returnRefundPercent,
        },
    });
}

