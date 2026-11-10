"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "@/components/ui/Illustration";

type Props = {
  icon?: ReactNode;
  illustration?: IllustrationName;
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ icon, illustration = "empty", title, body, action }: Props) {
  return (
    <motion.div
      className="flex min-h-[11rem] flex-col items-center justify-center gap-3 px-4 py-5 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
    >
      {illustration ? (
        <motion.div
          className="w-full max-w-[200px]"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 280, damping: 22 }}
        >
          <Illustration name={illustration} className="mx-auto h-28 w-auto" alt="" />
        </motion.div>
      ) : icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/60 text-[var(--accent)]">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {action}
    </motion.div>
  );
}
