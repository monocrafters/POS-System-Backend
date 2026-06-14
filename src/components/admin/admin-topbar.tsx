"use client";
import { Bell } from "lucide-react";
import { SyncIndicator } from "@/components/sync/sync-indicator";
import { AdminSearchDropdown } from "@/components/admin/admin-search-dropdown";
import { TopbarUserMenu } from "@/components/dashboard/topbar-user-menu";
import { useShopBranding } from "@/hooks/use-shop-settings";
import { getAdminNavItem, type AdminSectionId } from "./admin-nav";
interface AdminTopbarProps {
    activeSection: AdminSectionId;
    onNavigate: (section: AdminSectionId) => void;
}
export function AdminTopbar({ activeSection, onNavigate, }: AdminTopbarProps) {
    const nav = getAdminNavItem(activeSection);
    const { shopName } = useShopBranding();
    return (<header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-neutral-200 bg-white px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E31837] text-xs font-bold text-white" aria-hidden>
          {nav.label.charAt(0)}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold leading-tight text-neutral-900">
            {nav.label}
          </h1>
          <p className="truncate text-[11px] text-neutral-500">
            {shopName} · Administrator
          </p>
        </div>
      </div>

      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
        <AdminSearchDropdown onNavigate={onNavigate}/>

        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-1 py-0.5">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-white hover:text-[#E31837]" aria-label="Notifications">
            <Bell className="h-4 w-4"/>
          </button>
          <SyncIndicator />
        </div>

        <TopbarUserMenu />
      </div>
    </header>);
}

