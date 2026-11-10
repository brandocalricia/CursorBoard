"use client";

import { motion } from "framer-motion";
import { ArrowsClockwise } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { WidgetSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyNode?: ReactNode;
  emptyMessage?: string;
  sample?: boolean;
  className?: string;
  actions?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
};

export function WidgetShell({
  title,
  description,
  loading,
  error,
  empty,
  emptyNode,
  emptyMessage = "Nothing here yet",
  sample,
  className,
  actions,
  onRetry,
  children,
}: Props) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className={cn(
        "hd-card hd-card-interactive flex h-full flex-col overflow-hidden",
        className,
      )}
      style={{ padding: "var(--density-pad)" }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {sample ? (
              <span
                className="meta-chip"
                title="Sample or local fallback — connect a live source in .env.local"
              >
                Sample
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </header>

      <div className="hd-scroll min-h-0 flex-1 overflow-auto">
        {loading ? (
          <WidgetSkeleton />
        ) : error ? (
          <EmptyState
            illustration="empty"
            title="Couldn’t load this panel"
            body={error}
            action={
              onRetry ? (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <ArrowsClockwise className="h-3.5 w-3.5" />
                  Retry
                </Button>
              ) : undefined
            }
          />
        ) : empty ? (
          emptyNode ?? (
            <EmptyState illustration="empty" title={emptyMessage} body="Check back once data lands." />
          )
        ) : (
          children
        )}
      </div>
    </motion.section>
  );
}
