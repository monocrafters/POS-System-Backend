"use client";
import { SyncIndicator } from "@/components/sync/sync-indicator";
import { TopbarUserMenu } from "@/components/dashboard/topbar-user-menu";
import { useShopBranding } from "@/hooks/use-shop-settings";
import { getCashierNavItem, type CashierSectionId } from "./cashier-nav";
interface CashierTopbarProps {
    activeSection: CashierSectionId;
}
export function CashierTopbar({ activeSection }: CashierTopbarProps) {
    const nav = getCashierNavItem(activeSection);
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
            {shopName} · Cashier counter
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-0.5">
          <SyncIndicator />
        </div>
        <TopbarUserMenu />
      </div>
    </header>);
}

