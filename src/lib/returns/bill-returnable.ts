import type { BillItem, ReturnItem } from "@prisma/client";
type BillItemWithReturns = BillItem & {
    returnItems: ReturnItem[];
};
export function getReturnedQty(item: BillItemWithReturns): number {
    return item.returnItems.reduce((s, r) => s + r.quantity, 0);
}
export function getReturnableQty(item: BillItemWithReturns): number {
    return Math.max(0, item.quantity - getReturnedQty(item));
}

