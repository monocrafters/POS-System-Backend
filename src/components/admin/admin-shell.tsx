"use client";
import { useCallback, useState } from "react";
import { AdminLayout } from "./admin-layout";
import { AdminDashboardHome } from "./pages/admin-dashboard-home";
import { StaffManagementPage } from "./pages/staff-management-page";
import { ProductsPage } from "./pages/products-page";
import { AdminExpensesPage } from "./pages/admin-expenses-page";
import { AdminReturnsSettingsPage } from "./pages/admin-returns-settings-page";
import { AdminSettingsPage } from "./pages/admin-settings-page";
import { AdminBillsPage } from "./pages/admin-bills-page";
import { AdminSalesAnalyticsPage } from "./pages/admin-sales-analytics-page";
import { AdminStockAnalyticsPage } from "./pages/admin-stock-analytics-page";
import { useBarcodeListener } from "@/hooks/use-barcode-listener";
import { useBarcodeStore } from "@/store/barcode-store";
import type { AdminSectionId } from "./admin-nav";
export function AdminShell() {
    const [active, setActive] = useState<AdminSectionId>("dashboard");
    const pushScan = useBarcodeStore((s) => s.pushScan);
    const onBarcodeScanned = useCallback((code: string) => {
        setActive("products");
        pushScan(code);
    }, [pushScan]);
    useBarcodeListener(onBarcodeScanned);
    return (<AdminLayout activeSection={active} onNavigate={setActive}>
      {active === "dashboard" && (<AdminDashboardHome onNavigate={setActive}/>)}
      {active === "products" && <ProductsPage />}
      {active === "staff" && <StaffManagementPage />}
      {active === "bills" && <AdminBillsPage />}
      {active === "returns" && (<AdminReturnsSettingsPage onNavigate={setActive}/>)}
      {active === "settings" && <AdminSettingsPage />}
      {active === "sales-analytics" && <AdminSalesAnalyticsPage />}
      {active === "stock-analytics" && <AdminStockAnalyticsPage />}
      {active === "expenses" && <AdminExpensesPage />}
    </AdminLayout>);
}

