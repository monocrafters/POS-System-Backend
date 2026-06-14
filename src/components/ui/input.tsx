import * as React from "react";
import { cn } from "@/lib/utils";
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (<input type={type} data-slot="input" className={cn("flex h-11 w-full min-w-0 rounded-xl border px-4 py-2 text-[15px] text-neutral-900 transition-all outline-none placeholder:text-neutral-400/90", "focus-visible:border-red-300/80 focus-visible:ring-[3px] focus-visible:ring-red-500/12", "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50", "aria-invalid:border-red-400 aria-invalid:ring-red-500/15", className)} {...props}/>);
}
export { Input };

