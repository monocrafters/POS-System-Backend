"use client";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncIndicator } from "@/components/sync/sync-indicator";
import { useAuthStore } from "@/store/auth-store";
import type { ReactNode } from "react";
interface DashboardLayoutProps {
    title: string;
    subtitle: string;
    badge: string;
    badgeClass: string;
    children: ReactNode;
}
export function DashboardLayout({ title, subtitle, badge, badgeClass, children, }: DashboardLayoutProps) {
    const { user, logout } = useAuthStore();
    return (<div className="relative flex h-screen flex-col overflow-hidden bg-[#f5f5f7]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-red-50/30 to-white"/>
        <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-red-400/10 blur-[100px]"/>
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-rose-300/15 blur-[80px]"/>
      </div>

      <header className="relative z-10 flex items-center justify-between border-b border-white/60 bg-white/40 px-6 py-4 backdrop-blur-2xl">
        <div>
          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${badgeClass}`}>
            {badge}
          </span>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900">
            {title}
          </h1>
          <p className="text-sm text-neutral-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <SyncIndicator />
          <div className="text-right">
            <p className="text-sm font-medium text-neutral-800">
              {user?.fullName}
            </p>
            <p className="text-xs text-neutral-500">@{user?.username}</p>
          </div>
          <Button variant="outline" onClick={logout} className="gap-2 rounded-xl border-white/80 bg-white/50 backdrop-blur-md">
            <LogOut className="h-4 w-4"/>
            Sign Out
          </Button>
        </div>
      </header>

      <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex-1 overflow-auto p-6">
        {children}
      </motion.main>
    </div>);
}

