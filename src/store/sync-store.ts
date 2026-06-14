import { create } from "zustand";
export type SyncPhase = "idle" | "syncing" | "success" | "error" | "offline";
interface SyncState {
    phase: SyncPhase;
    isOnline: boolean;
    lastSyncAt: string | null;
    lastMessage: string | null;
    pulled: number;
    pushed: number;
    setOnline: (online: boolean) => void;
    setSyncing: () => void;
    setResult: (result: {
        success: boolean;
        pulled?: number;
        pushed?: number;
        syncedAt?: string;
        error?: string;
        skipped?: boolean;
        reason?: string;
    }) => void;
}
export const useSyncStore = create<SyncState>((set) => ({
    phase: "idle",
    isOnline: true,
    lastSyncAt: null,
    lastMessage: null,
    pulled: 0,
    pushed: 0,
    setOnline: (online) => set({
        isOnline: online,
        phase: online ? "idle" : "offline",
    }),
    setSyncing: () => set({ phase: "syncing", lastMessage: "Syncing with cloud…" }),
    setResult: (result) => {
        if (result.skipped) {
            set({
                phase: "idle",
                lastMessage: result.reason ?? "Cloud sync not configured",
            });
            return;
        }
        if (!result.success) {
            set({
                phase: "error",
                lastMessage: result.error ?? "Sync failed",
            });
            return;
        }
        set({
            phase: "success",
            lastSyncAt: result.syncedAt ?? new Date().toISOString(),
            lastMessage: `Backed up · ${result.pushed ?? 0} pushed, ${result.pulled ?? 0} pulled`,
            pulled: result.pulled ?? 0,
            pushed: result.pushed ?? 0,
        });
        setTimeout(() => set({ phase: "idle" }), 4000);
    },
}));

