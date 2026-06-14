export type ReceiptWidthMm = 58 | 80;
export const RECEIPT_WIDTH_KEY = "pos-receipt-width-mm";
export function getReceiptWidth(): ReceiptWidthMm {
    if (typeof window === "undefined")
        return 80;
    const v = localStorage.getItem(RECEIPT_WIDTH_KEY);
    return v === "58" ? 58 : 80;
}
export function setReceiptWidth(mm: ReceiptWidthMm): void {
    localStorage.setItem(RECEIPT_WIDTH_KEY, String(mm));
}
export async function resolveReceiptWidth(): Promise<{
    widthMm: ReceiptWidthMm;
    printerName: string | null;
    auto: boolean;
}> {
    if (typeof window !== "undefined" && window.electronAPI?.getReceiptPrinterInfo) {
        try {
            const info = await window.electronAPI.getReceiptPrinterInfo();
            setReceiptWidth(info.widthMm);
            return { widthMm: info.widthMm, printerName: info.printerName, auto: true };
        }
        catch {
        }
    }
    return {
        widthMm: getReceiptWidth(),
        printerName: null,
        auto: false,
    };
}
export function formatMoney(n: number) {
    return `Rs ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
export function formatReceiptDate(iso: string) {
    return new Date(iso).toLocaleString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
export interface ReceiptBillData {
    billNumber: string;
    createdAt: string;
    cashierName: string;
    items: {
        name: string;
        quantity: number;
        unitPrice: number;
        lineDiscount?: number;
        lineTotal: number;
    }[];
    subtotal: number;
    discountAmount: number;
    total: number;
    itemCount: number;
}
export function printThermalReceipt(widthMm: ReceiptWidthMm) {
    const styleId = "thermal-print-page-style";
    let el = document.getElementById(styleId);
    if (!el) {
        el = document.createElement("style");
        el.id = styleId;
        document.head.appendChild(el);
    }
    el.textContent = `
    @media print {
      @page { size: ${widthMm}mm auto; margin: 2mm; }
      body * { visibility: hidden !important; }
      #thermal-receipt-root, #thermal-receipt-root * {
        visibility: visible !important;
      }
      #thermal-receipt-root {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: ${widthMm}mm !important;
      }
    }
  `;
    window.print();
}

