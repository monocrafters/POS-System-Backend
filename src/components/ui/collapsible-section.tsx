"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    title: string;
    icon?: LucideIcon;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    className?: string;
};

export function CollapsibleSection({
    title,
    icon: Icon,
    open,
    onToggle,
    children,
    className,
}: Props) {
    return (
        <div className={cn("rounded-xl border border-neutral-200 bg-white overflow-hidden", className)}>
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-neutral-50/80 transition-colors">
                <span className="flex items-center gap-2.5 text-sm font-bold text-neutral-900">
                    {Icon ? <Icon className="h-4 w-4 text-[#E31837] shrink-0" /> : null}
                    {title}
                </span>
                {open ? (
                    <ChevronUp className="h-4 w-4 text-neutral-500 shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-500 shrink-0" />
                )}
            </button>
            {open ? (
                <div className="border-t border-neutral-100 px-4 pb-4 pt-3">{children}</div>
            ) : null}
        </div>
    );
}
