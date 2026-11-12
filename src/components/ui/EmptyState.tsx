"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  /** @deprecated CryptoZen empty states are text-first; illustrations ignored */
  illustration?: string;
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <motion.div
      className="flex min-h-[9rem] flex-col items-start justify-center gap-2 px-1 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {icon ? (
        <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-[var(--accent)]">
          {icon}
        </div>
      ) : (
        <div className="mb-1 h-0.5 w-8 bg-[var(--accent)]" aria-hidden />
      )}
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-[22rem] text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </motion.div>
  );
}
