"use client";
import { UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { cashierNavItems, type CashierNavItem, type CashierSectionId, } from "./cashier-nav";
interface CashierSidebarProps {
    active: CashierSectionId;
    onNavigate: (id: CashierSectionId) => void;
}
const groups = ["Main", "Sales", "Inventory", "Analytics"] as const;
function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}
export function CashierSidebar({ active, onNavigate }: CashierSidebarProps) {
    const user = useAuthStore((s) => s.user);
    const byGroup = groups.map((group) => ({
        group,
        items: cashierNavItems.filter((i) => i.group === group),
    }));
    const displayName = user?.fullName ?? "Cashier";
    const username = user?.username ?? "cashier";
    return (<aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-neutral-200/80 bg-white">
      <div className="border-b border-neutral-100 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E31837] text-sm font-bold text-white shadow-md shadow-red-600/20">
            {getInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-neutral-900">
              {displayName}
            </p>
            <p className="truncate text-[12px] text-neutral-500">@{username}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600 ring-1 ring-neutral-200">
              <UserCircle className="h-3 w-3"/>
              Cashier
            </span>
          </div>
        </div>
      </div>

      <nav className="scrollbar-modern flex-1 overflow-y-auto px-3 py-4">
        {byGroup.map(({ group, items }) => (<div key={group} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              {group}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => (<NavButton key={item.id} item={item} isActive={active === item.id} onClick={() => onNavigate(item.id)}/>))}
            </ul>
          </div>))}
      </nav>
    </aside>);
}
function NavButton({ item, isActive, onClick, }: {
    item: CashierNavItem;
    isActive: boolean;
    onClick: () => void;
}) {
    const Icon = item.icon;
    return (<li>
      <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-all duration-200", isActive
            ? "bg-[#E31837] text-white shadow-md shadow-red-600/25"
            : "text-neutral-600 hover:bg-red-50 hover:text-[#E31837]")}>
        <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-white" : "text-[#E31837]")} strokeWidth={2}/>
        <span className="truncate">{item.label}</span>
      </button>
    </li>);
}

