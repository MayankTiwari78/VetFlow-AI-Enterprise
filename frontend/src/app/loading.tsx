"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function Loading() {
  return (
    <div className="mf-page flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="grid h-14 w-14 place-items-center rounded-2xl gradient-bg text-white shadow-soft-lg"
        >
          <Activity className="h-6 w-6" strokeWidth={2.5} />
        </motion.div>
        <div>
          <p className="text-sm font-semibold text-ink">Loading MedFlow AI</p>
          <p className="mt-1 text-sm text-muted">
            Preparing your veterinary care dashboard...
          </p>
        </div>
      </div>
    </div>
  );
}
