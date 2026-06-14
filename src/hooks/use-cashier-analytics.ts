"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { apiFetchCashierAnalytics, type CashierAnalytics, } from "@/lib/api-client";
let cache: CashierAnalytics | null = null;
let cacheToken: string | null = null;
export function useCashierAnalytics() {
    const token = useAuthStore((s) => s.token);
    const [data, setData] = useState<CashierAnalytics | null>(cache && cacheToken === token ? cache : null);
    const [loading, setLoading] = useState(!data);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const refresh = useCallback(async (force = false) => {
        if (!token)
            return;
        if (!force && cache && cacheToken === token) {
            setData(cache);
            setLoading(false);
            return;
        }
        const showSkeleton = !data && !cache;
        if (showSkeleton)
            setLoading(true);
        else
            setRefreshing(true);
        setError(null);
        try {
            const res = await apiFetchCashierAnalytics(token);
            cache = res.analytics;
            cacheToken = token;
            setData(res.analytics);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load");
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, data]);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    const invalidate = useCallback(() => {
        cache = null;
        cacheToken = null;
        void refresh(true);
    }, [refresh]);
    return {
        data,
        loading: loading && !data,
        refreshing,
        error,
        refresh: () => refresh(true),
        invalidate,
    };
}
export function invalidateCashierAnalyticsCache() {
    cache = null;
    cacheToken = null;
}

