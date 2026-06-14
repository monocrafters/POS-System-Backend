"use client";
import type { ReactNode } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import type { AdminSectionId } from "./admin-nav";
interface AdminLayoutProps {
    activeSection: AdminSectionId;
    onNavigate: (id: AdminSectionId) => void;
    children: ReactNode;
}
export function AdminLayout({ activeSection, onNavigate, children, }: AdminLayoutProps) {
    return (<div className="flex h-screen overflow-hidden bg-neutral-50">
      <AdminSidebar active={activeSection} onNavigate={onNavigate}/>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar activeSection={activeSection} onNavigate={onNavigate}/>
        <main className="scrollbar-modern min-w-0 flex-1 overflow-auto bg-white">
          {children}
        </main>
      </div>
    </div>);
}

