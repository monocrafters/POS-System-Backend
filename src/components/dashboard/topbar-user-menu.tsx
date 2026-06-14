"use client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
export function TopbarUserMenu() {
    const { user, logout } = useAuthStore();
    return (<div className="flex items-center gap-3 border-l border-neutral-200 pl-3">
      <div className="hidden text-right md:block">
        <p className="text-sm font-medium leading-tight text-neutral-900">
          {user?.fullName}
        </p>
        <p className="text-[11px] text-neutral-500">@{user?.username}</p>
      </div>
      <Button type="button" onClick={logout} className="h-9 gap-2 rounded-lg bg-[#E31837] px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-700">
        <LogOut className="h-4 w-4"/>
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>);
}

