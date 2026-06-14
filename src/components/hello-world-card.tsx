"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Store } from "lucide-react";
import { useAppStore } from "@/store/app-store";
export function HelloWorldCard() {
    const { initElectronBridge } = useAppStore();
    useEffect(() => {
        initElectronBridge();
    }, [initElectronBridge]);
    return (<motion.div initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="glass-strong w-full rounded-2xl p-10 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-400/30">
        <Store className="h-8 w-8 text-indigo-300"/>
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }} className="text-gradient text-5xl font-bold tracking-tight">
        Hello World
      </motion.h1>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="mt-4 text-base leading-relaxed text-muted-foreground">
        Your professional desktop POS is ready.
        <br />
        <span className="text-sm text-muted-foreground/80">
          Next.js · Electron · Tailwind · Prisma
        </span>
      </motion.p>

      <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "4rem" }} transition={{ delay: 0.7, duration: 0.4 }} className="mx-auto mt-8 h-0.5 rounded-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent"/>
    </motion.div>);
}

