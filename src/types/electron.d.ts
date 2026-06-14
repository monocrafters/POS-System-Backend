export interface ReceiptPrinterInfo {
    widthMm: 58 | 80;
    printerName: string | null;
}
export interface ElectronAPI {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    isPackaged: () => Promise<boolean>;
    getNetworkStatus: () => Promise<boolean>;
    getReceiptPrinterInfo: () => Promise<ReceiptPrinterInfo>;
    onNetworkOnline: (callback: () => void) => () => void;
    onNetworkOffline: (callback: () => void) => () => void;
}
declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}
export {};

