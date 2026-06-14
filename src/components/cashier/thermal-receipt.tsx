"use client";
import { cn } from "@/lib/utils";
import { formatMoney, formatReceiptDate, type ReceiptBillData, type ReceiptWidthMm, } from "@/lib/receipt";
interface ThermalReceiptProps {
    bill: ReceiptBillData;
    widthMm: ReceiptWidthMm;
    shopName?: string;
    shopTagline?: string;
    shopPhone?: string | null;
    className?: string;
    id?: string;
}
export function ThermalReceipt({ bill, widthMm, shopName = "Bata POS", shopTagline = "Retail Store", shopPhone, className, id = "thermal-receipt-root", }: ThermalReceiptProps) {
    return (<div id={id} className={cn("mx-auto bg-white font-mono text-neutral-900", widthMm === 58 ? "receipt-58" : "receipt-80", className)} style={{ width: `${widthMm}mm`, maxWidth: `${widthMm}mm` }}>
      <div className="border-b border-dashed border-neutral-400 pb-1 text-center leading-tight">
        <p className="text-[1em] font-bold tracking-tight">{shopName}</p>
        <p className="text-[0.72em] text-neutral-600">
          {shopTagline}
          {shopPhone ? (<>
              {" "}
              · <span className="text-neutral-700">{shopPhone}</span>
            </>) : null}
        </p>
        <p className="mt-0.5 break-all text-[0.95em] font-extrabold">
          <span className="text-[0.65em] font-semibold uppercase tracking-wide text-neutral-500">
            Bill{" "}
          </span>
          {bill.billNumber}
        </p>
      </div>

      <div className="mt-1 space-y-0 text-[0.85em] leading-snug">
        <p>
          <span className="text-neutral-500">Date:</span>{" "}
          {formatReceiptDate(bill.createdAt)}
        </p>
        <p>
          <span className="text-neutral-500">Cashier:</span>{" "}
          <span className="font-semibold">{bill.cashierName}</span>
        </p>
      </div>

      <div className="my-2 border-t border-dashed border-neutral-300"/>

      <table className="w-full border-collapse text-[0.85em]">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="py-1 text-left font-semibold">Item</th>
            <th className="py-1 text-center font-semibold">Qty</th>
            <th className="py-1 text-right font-semibold">Amt</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, i) => (<tr key={i} className="border-b border-neutral-100">
              <td className="py-1.5 pr-1 align-top leading-tight">
                <span className="block break-words">{item.name}</span>
                <span className="text-[0.8em] text-neutral-500">
                  @{formatMoney(item.unitPrice)}
                  {(item.lineDiscount ?? 0) > 0 && (<>
                      {" "}
                      · disc −{formatMoney(item.lineDiscount ?? 0)}
                    </>)}
                </span>
              </td>
              <td className="py-1.5 text-center align-top">{item.quantity}</td>
              <td className="py-1.5 text-right align-top whitespace-nowrap">
                {formatMoney(item.lineTotal)}
              </td>
            </tr>))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed border-neutral-300"/>

      <div className="space-y-1 text-[0.95em]">
        <div className="flex justify-between">
          <span>Items</span>
          <span>{bill.itemCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(bill.subtotal)}</span>
        </div>
        {bill.discountAmount > 0 && (<div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatMoney(bill.discountAmount)}</span>
          </div>)}
        <div className="flex justify-between font-bold text-[1.05em]">
          <span>TOTAL</span>
          <span>{formatMoney(bill.total)}</span>
        </div>
      </div>

      <div className="mt-3 border-t border-dashed border-neutral-400 pt-2 text-center text-[0.85em]">
        <p>Thank you for shopping!</p>
        <p className="mt-1 text-neutral-500">Please keep this receipt</p>
      </div>
    </div>);
}

