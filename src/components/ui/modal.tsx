"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}
export function Modal({ open, onClose, title, description, children, className, }: ModalProps) {
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape")
                onClose();
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);
    if (typeof document === "undefined")
        return null;
    return createPortal(<AnimatePresence>
      {open && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden/>
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} role="dialog" aria-modal aria-labelledby="modal-title" className={cn("pointer-events-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]", className)} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-neutral-100 bg-gradient-to-r from-red-50/80 to-white px-6 py-5">
                <div>
                  <h2 id="modal-title" className="text-lg font-bold text-neutral-900">
                    {title}
                  </h2>
                  {description && (<p className="mt-1 text-sm text-neutral-500">
                      {description}
                    </p>)}
                </div>
                <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700" aria-label="Close">
                  <X className="h-5 w-5"/>
                </button>
              </div>
              <div className="px-6 py-5">{children}</div>
            </motion.div>
          </div>
        </>)}
    </AnimatePresence>, document.body);
}

