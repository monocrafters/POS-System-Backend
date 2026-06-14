import { LayoutDashboard, Package, Users, Receipt, RotateCcw, TrendingUp, BarChart3, Wallet, Settings, type LucideIcon, } from "lucide-react";
export type AdminSectionId = "dashboard" | "products" | "staff" | "bills" | "returns" | "settings" | "sales-analytics" | "stock-analytics" | "expenses";
export interface AdminNavItem {
    id: AdminSectionId;
    label: string;
    icon: LucideIcon;
    group?: string;
}
export const adminNavItems: AdminNavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Main" },
    { id: "products", label: "Products", icon: Package, group: "Inventory" },
    {
        id: "staff",
        label: "Staff Management",
        icon: Users,
        group: "Inventory",
    },
    { id: "bills", label: "Bills", icon: Receipt, group: "Sales" },
    { id: "returns", label: "Returns", icon: RotateCcw, group: "Sales" },
    {
        id: "sales-analytics",
        label: "Sales Analytics",
        icon: TrendingUp,
        group: "Analytics",
    },
    {
        id: "stock-analytics",
        label: "Stock Analytics",
        icon: BarChart3,
        group: "Analytics",
    },
    { id: "expenses", label: "Expenses", icon: Wallet, group: "Finance" },
    { id: "settings", label: "Settings", icon: Settings, group: "System" },
];
export function getAdminNavItem(id: AdminSectionId): AdminNavItem {
    return adminNavItems.find((i) => i.id === id) ?? adminNavItems[0];
}

