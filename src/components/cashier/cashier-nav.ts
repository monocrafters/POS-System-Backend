import { LayoutDashboard, ScanBarcode, Receipt, RotateCcw, Sun, TrendingUp, CircleDollarSign, BarChart3, Package, type LucideIcon, } from "lucide-react";
export type CashierSectionId = "home" | "billing" | "bills" | "returns" | "stocks" | "today-sales" | "total-sales" | "revenue" | "analytics";
export interface CashierNavItem {
    id: CashierSectionId;
    label: string;
    icon: LucideIcon;
    group?: string;
}
export const cashierNavItems: CashierNavItem[] = [
    { id: "home", label: "Dashboard", icon: LayoutDashboard, group: "Main" },
    { id: "billing", label: "New Sale", icon: ScanBarcode, group: "Main" },
    { id: "bills", label: "My Bills", icon: Receipt, group: "Sales" },
    { id: "returns", label: "Returns", icon: RotateCcw, group: "Sales" },
    { id: "stocks", label: "Stocks", icon: Package, group: "Inventory" },
    {
        id: "today-sales",
        label: "Today Sales",
        icon: Sun,
        group: "Analytics",
    },
    {
        id: "total-sales",
        label: "Total Sales",
        icon: TrendingUp,
        group: "Analytics",
    },
    { id: "revenue", label: "Revenue", icon: CircleDollarSign, group: "Analytics" },
    {
        id: "analytics",
        label: "Analytics",
        icon: BarChart3,
        group: "Analytics",
    },
];
export function getCashierNavItem(id: CashierSectionId): CashierNavItem {
    return cashierNavItems.find((i) => i.id === id) ?? cashierNavItems[0];
}

