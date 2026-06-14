"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { ensureCatalog, isCatalogLoaded } from "@/lib/pos-catalog-cache";
export function usePosCatalog() {
    const token = useAuthStore((s) => s.token);
    const [ready, setReady] = useState(isCatalogLoaded());
    useEffect(() => {
        let cancelled = false;
        setReady(isCatalogLoaded());
        void ensureCatalog(token)
            .then(() => {
            if (!cancelled)
                setReady(true);
        })
            .catch(() => {
            if (!cancelled)
                setReady(false);
        });
        return () => {
            cancelled = true;
        };
    }, [token]);
    return { ready };
}

