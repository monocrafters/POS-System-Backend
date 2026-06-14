"use client";
import type { ReactNode } from "react";
import { CashierSidebar } from "./cashier-sidebar";
import { CashierTopbar } from "./cashier-topbar";
import type { CashierSectionId } from "./cashier-nav";
interface CashierLayoutProps {
    activeSection: CashierSectionId;
    onNavigate: (id: CashierSectionId) => void;
    children: ReactNode;
}
export function CashierLayout({ activeSection, onNavigate, children, }: CashierLayoutProps) {
    return (<div className="flex h-screen overflow-hidden bg-neutral-50">
      <CashierSidebar active={activeSection} onNavigate={onNavigate}/>
      <div className="flex min-w-0 flex-1 flex-col">
        <CashierTopbar activeSection={activeSection}/>
        <main className={cnMain(activeSection)}>
          {children}
        </main>
      </div>
    </div>);
}
function cnMain(section: CashierSectionId) {
    const base = "min-w-0 flex-1 bg-white px-4 py-4 lg:px-6 lg:py-5";
    if (section === "billing") {
        return `${base} flex min-h-0 flex-col overflow-hidden !px-0 !py-0`;
    }
    const innerScroll: CashierSectionId[] = [
        "bills",
        "returns",
        "today-sales",
        "total-sales",
        "revenue",
    ];
    if (innerScroll.includes(section)) {
        return `${base} flex min-h-0 flex-col overflow-hidden`;
    }
    return `${base} scrollbar-modern min-h-0 overflow-y-auto overflow-x-hidden`;
}

