"use client";
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from "lucide-react";
import { useSyncStore } from "@/store/sync-store";
import { cn } from "@/lib/utils";
export function SyncIndicator() {
    const { phase, lastMessage, isOnline } = useSyncStore();
    const icon = phase === "syncing" ? (<Loader2 className="h-3.5 w-3.5 animate-spin"/>) : phase === "success" ? (<Check className="h-3.5 w-3.5 text-emerald-600"/>) : phase === "error" ? (<AlertCircle className="h-3.5 w-3.5 text-amber-600"/>) : !isOnline ? (<CloudOff className="h-3.5 w-3.5 text-neutral-400"/>) : (<Cloud className="h-3.5 w-3.5 text-[#E31837]"/>);
    return (<div className={cn("flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-neutral-600", phase === "offline" && "text-neutral-400")} title={lastMessage ?? undefined}>
      {icon}
      <span>
        {phase === "syncing"
            ? "Cloud sync…"
            : phase === "offline"
                ? "Offline"
                : phase === "error"
                    ? "Sync issue"
                    : phase === "success"
                        ? "Synced"
                        : "Cloud ready"}
      </span>
    </div>);
}

