import { create } from "zustand";
const DEDUPE_MS = 2000;
interface BarcodeStore {
    pendingScan: string | null;
    scanTick: number;
    pushScan: (barcode: string) => void;
    clearPending: () => void;
}
let lastPushed: {
    code: string;
    at: number;
} | null = null;
export const useBarcodeStore = create<BarcodeStore>((set) => ({
    pendingScan: null,
    scanTick: 0,
    pushScan: (barcode) => {
        const code = barcode.trim();
        if (!code)
            return;
        const now = Date.now();
        if (lastPushed &&
            lastPushed.code === code &&
            now - lastPushed.at < DEDUPE_MS) {
            return;
        }
        lastPushed = { code, at: now };
        set((s) => ({
            pendingScan: code,
            scanTick: s.scanTick + 1,
        }));
    },
    clearPending: () => set({ pendingScan: null }),
}));

