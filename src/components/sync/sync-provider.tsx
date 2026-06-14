"use client";
import { useEffect, useState } from "react";
import { useCloudSync } from "@/hooks/use-cloud-sync";
import { useAuthStore } from "@/store/auth-store";
export function SyncProvider({ children }: {
    children: React.ReactNode;
}) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const token = useAuthStore((s) => s.token);
    const role = useAuthStore((s) => s.user?.role);
    const [authReady, setAuthReady] = useState(false);
    useEffect(() => {
        if (useAuthStore.persist.hasHydrated()) {
            setAuthReady(true);
            return;
        }
        const unsub = useAuthStore.persist.onFinishHydration(() => setAuthReady(true));
        const t = window.setTimeout(() => setAuthReady(true), 1000);
        return () => {
            unsub();
            window.clearTimeout(t);
        };
    }, []);
    useCloudSync({ enabled: authReady && isAuthenticated && role === "ADMIN", token });
    return <>{children}</>;
}

