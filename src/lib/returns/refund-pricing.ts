export function getBillDiscountScale(subtotal: number, total: number): number {
    if (subtotal <= 0)
        return 1;
    return total / subtotal;
}
export function getEffectiveUnitPrice(item: {
    lineTotal: number;
    quantity: number;
}, bill: {
    subtotal: number;
    total: number;
}): number {
    if (item.quantity <= 0)
        return 0;
    const scale = getBillDiscountScale(bill.subtotal, bill.total);
    return (item.lineTotal / item.quantity) * scale;
}
export function getLineRefundAmount(item: {
    lineTotal: number;
    quantity: number;
}, bill: {
    subtotal: number;
    total: number;
}, returnQty: number, refundPercent: number): number {
    const unit = getEffectiveUnitPrice(item, bill);
    return unit * returnQty * (refundPercent / 100);
}
