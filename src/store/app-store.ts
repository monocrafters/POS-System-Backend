import { create } from "zustand";
interface AppState {
    version: string | null;
    platform: string | null;
    isPackaged: boolean;
    initElectronBridge: () => Promise<void>;
}
export const useAppStore = create<AppState>((set) => ({
    version: null,
    platform: null,
    isPackaged: false,
    initElectronBridge: async () => {
        if (typeof window === "undefined" || !window.electronAPI)
            return;
        const [version, platform, isPackaged] = await Promise.all([
            window.electronAPI.getVersion(),
            window.electronAPI.getPlatform(),
            window.electronAPI.isPackaged(),
        ]);
        set({ version, platform, isPackaged });
    },
}));

