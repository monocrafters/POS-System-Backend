"use client";
import { useCallback, useEffect, useRef } from "react";
import { useSyncStore } from "@/store/sync-store";
import type { SyncResult } from "@/lib/sync/types";
import { parseJsonResponse } from "@/lib/parse-json-response";
const SYNC_INTERVAL_MS = 30000;
async function runSyncApi(token: string | null): Promise<SyncResult> {
    const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    const data = await parseJsonResponse<SyncResult & {
        message?: string;
    }>(res);
    if (!res.ok) {
        throw new Error((data as {
            message?: string;
        }).message ?? "Sync failed");
    }
    return data;
}
export function useCloudSync(options?: {
    enabled?: boolean;
    token?: string | null;
}) {
    const enabled = options?.enabled !== false;
    const token = options?.token ?? null;
    const setOnline = useSyncStore((s) => s.setOnline);
    const setSyncing = useSyncStore((s) => s.setSyncing);
    const setResult = useSyncStore((s) => s.setResult);
    const isSyncingRef = useRef(false);
    const performSync = useCallback(async () => {
        if (!enabled)
            return;
        if (isSyncingRef.current)
            return;
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setOnline(false);
            return;
        }
        isSyncingRef.current = true;
        setSyncing();
        try {
            const result = await runSyncApi(token);
            setResult(result);
        }
        catch (err) {
            setResult({
                success: false,
                error: err instanceof Error ? err.message : "Sync failed",
                pulled: 0,
                pushed: 0,
                syncedAt: new Date().toISOString(),
            });
        }
        finally {
            isSyncingRef.current = false;
        }
    }, [enabled, token, setOnline, setSyncing, setResult]);
    useEffect(() => {
        if (!enabled)
            return;
        const handleOnline = () => {
            setOnline(true);
            void performSync();
        };
        const handleOffline = () => setOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        if (navigator.onLine) {
            setOnline(true);
            void performSync();
        }
        else {
            setOnline(false);
        }
        const interval = setInterval(() => {
            if (navigator.onLine)
                void performSync();
        }, SYNC_INTERVAL_MS);
        let cleanupElectron: (() => void) | undefined;
        if (typeof window !== "undefined" && window.electronAPI?.onNetworkOnline) {
            cleanupElectron = window.electronAPI.onNetworkOnline(() => {
                setOnline(true);
                void performSync();
            });
            void window.electronAPI.getNetworkStatus?.().then((online) => {
                setOnline(online);
                if (online)
                    void performSync();
            });
        }
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            clearInterval(interval);
            cleanupElectron?.();
        };
    }, [enabled, performSync, setOnline]);
    return { performSync };
}

