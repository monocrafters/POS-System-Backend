import { adminNavItems, type AdminSectionId } from "@/components/admin/admin-nav";
export const ADMIN_BILLS_SEARCH_KEY = "pos-admin-bills-search";
export function filterNavByQuery(q: string) {
    const lower = q.trim().toLowerCase();
    if (!lower)
        return [];
    return adminNavItems.filter((item) => item.label.toLowerCase().includes(lower) ||
        item.id.toLowerCase().includes(lower) ||
        (item.group?.toLowerCase().includes(lower) ?? false));
}
export function setBillsSearchPrefill(billNumber: string) {
    if (typeof window === "undefined")
        return;
    sessionStorage.setItem(ADMIN_BILLS_SEARCH_KEY, billNumber);
}
export function consumeBillsSearchPrefill(): string {
    if (typeof window === "undefined")
        return "";
    const v = sessionStorage.getItem(ADMIN_BILLS_SEARCH_KEY) ?? "";
    sessionStorage.removeItem(ADMIN_BILLS_SEARCH_KEY);
    return v;
}

