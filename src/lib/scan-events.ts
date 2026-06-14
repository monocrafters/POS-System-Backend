let lastScan: {
    barcode: string;
    at: number;
} | null = null;
export function pushBarcodeScan(barcode: string): void {
    lastScan = { barcode: barcode.trim(), at: Date.now() };
}
export function consumeBarcodeScan(): string | null {
    if (!lastScan)
        return null;
    const code = lastScan.barcode;
    lastScan = null;
    return code;
}
export function peekBarcodeScan(maxAgeMs = 5000): string | null {
    if (!lastScan)
        return null;
    if (Date.now() - lastScan.at > maxAgeMs) {
        lastScan = null;
        return null;
    }
    return lastScan.barcode;
}

