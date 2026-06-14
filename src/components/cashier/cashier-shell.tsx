"use client";
import { useCallback, useState, useEffect } from "react";
import { CashierLayout } from "./cashier-layout";
import { CashierHome } from "./pages/cashier-home";
import { BillingPage } from "./pages/billing-page";
import { BillsHistoryPage } from "./pages/bills-history-page";
import { ReturnsPage } from "./pages/returns-page";
import { TodaySalesPage } from "./pages/today-sales-page";
import { TotalSalesPage } from "./pages/total-sales-page";
import { RevenuePage } from "./pages/revenue-page";
import { AnalyticsPage } from "./pages/analytics-page";
import { StocksPage } from "./pages/stocks-page";
import { useBarcodeListener } from "@/hooks/use-barcode-listener";
import { useBarcodeStore } from "@/store/barcode-store";
import { useAuthStore } from "@/store/auth-store";
import { ensureCatalog } from "@/lib/pos-catalog-cache";
import type { CashierSectionId } from "./cashier-nav";
export function CashierShell() {
    const [active, setActive] = useState<CashierSectionId>("home");
    const token = useAuthStore((s) => s.token);
    const pushScan = useBarcodeStore((s) => s.pushScan);
    useEffect(() => {
        void ensureCatalog(token);
    }, [token]);
    const onBarcodeScanned = useCallback((code: string) => {
        setActive("billing");
        pushScan(code);
    }, [pushScan]);
    useBarcodeListener(onBarcodeScanned);
    return (<CashierLayout activeSection={active} onNavigate={setActive}>
      {active === "home" && <CashierHome onNavigate={setActive}/>}
      {active === "billing" && <BillingPage />}
      {active === "bills" && <BillsHistoryPage />}
      {active === "returns" && <ReturnsPage />}
      {active === "stocks" && <StocksPage />}
      {active === "today-sales" && <TodaySalesPage />}
      {active === "total-sales" && <TotalSalesPage />}
      {active === "revenue" && <RevenuePage />}
      {active === "analytics" && <AnalyticsPage />}
    </CashierLayout>);
}

