"use client";

import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  sample?: boolean;
  className?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function WidgetShell({
  title,
  description,
  loading,
  error,
  empty,
  emptyMessage = "Nothing here yet",
  sample,
  className,
  actions,
  children,
}: Props) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      whileHover={{ y: -2 }}
      className={cn("hd-card flex h-full flex-col overflow-hidden", className)}
      style={{ padding: "var(--density-pad)" }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-foreground">
              {title}
            </h2>
            {sample ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Sample
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </header>

      <div className="hd-scroll min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading</span>
          </div>
        ) : error ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <AlertCircle className="h-5 w-5 text-[var(--danger)]" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : empty ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </motion.section>
  );
}
