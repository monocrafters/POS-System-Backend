"use client";
import { useEffect, useState } from "react";
import { LoginPage } from "@/components/auth/login-page";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { CashierDashboard } from "@/components/dashboard/cashier-dashboard";
import { useAuthStore } from "@/store/auth-store";
export default function HomePage() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        const onReady = () => setHydrated(true);
        if (useAuthStore.persist.hasHydrated()) {
            onReady();
            return;
        }
        const unsub = useAuthStore.persist.onFinishHydration(onReady);
        const failsafe = window.setTimeout(onReady, 1000);
        void Promise.resolve(useAuthStore.persist.rehydrate()).catch(() => {
            useAuthStore.getState().logout();
        });
        return () => {
            unsub();
            window.clearTimeout(failsafe);
        };
    }, []);
    if (!hydrated) {
        return (<div className="flex h-screen items-center justify-center bg-white">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#E31837]/20 border-t-[#E31837]"/>
      </div>);
    }
    if (!isAuthenticated || !user) {
        return <LoginPage />;
    }
    if (user.role === "ADMIN") {
        return <AdminDashboard />;
    }
    return <CashierDashboard />;
}

