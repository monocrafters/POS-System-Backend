"use client";
import { Receipt } from "lucide-react";
import { formatMoney, formatReceiptDate } from "@/lib/receipt";
export function SalesBillRow({ billNumber, createdAt, itemCount, total, discountAmount, }: {
    billNumber: string;
    createdAt: string;
    itemCount: number;
    total: number;
    discountAmount?: number;
}) {
    return (<li className="flex min-w-0 items-center gap-3 border-b border-neutral-100 py-3 last:border-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
        <Receipt className="h-4 w-4"/>
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block truncate text-sm font-bold text-neutral-900">
          {billNumber}
        </span>
        <span className="block truncate text-xs text-neutral-500">
          {formatReceiptDate(createdAt)} · {itemCount} items
          {discountAmount != null && discountAmount > 0 && (<> · −{formatMoney(discountAmount)}</>)}
        </span>
      </span>
      <span className="shrink-0 text-sm font-bold tabular-nums text-[#E31837]">
        {formatMoney(total)}
      </span>
    </li>);
}

