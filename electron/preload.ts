import { contextBridge, ipcRenderer } from "electron";
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
const electronAPI: ElectronAPI = {
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    getPlatform: () => ipcRenderer.invoke("app:get-platform"),
    isPackaged: () => ipcRenderer.invoke("app:is-packaged"),
    getNetworkStatus: () => ipcRenderer.invoke("network:status"),
    getReceiptPrinterInfo: () => ipcRenderer.invoke("printer:receipt-width"),
    onNetworkOnline: (callback) => {
        const handler = () => callback();
        ipcRenderer.on("network:online", handler);
        return () => ipcRenderer.removeListener("network:online", handler);
    },
    onNetworkOffline: (callback) => {
        const handler = () => callback();
        ipcRenderer.on("network:offline", handler);
        return () => ipcRenderer.removeListener("network:offline", handler);
    },
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

