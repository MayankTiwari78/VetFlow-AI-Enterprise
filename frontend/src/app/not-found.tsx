"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mf-page flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-mist text-primary shadow-soft"
        >
          <Search className="h-8 w-8" strokeWidth={1.5} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-5xl font-extrabold text-ink"
        >
          404
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-lg font-semibold text-ink"
        >
          Page not found
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 text-sm leading-relaxed text-muted"
        >
          The page you are looking for may have been removed, renamed, or
          temporarily unavailable.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Link
            href="/"
            className="mf-button inline-flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            Return home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
