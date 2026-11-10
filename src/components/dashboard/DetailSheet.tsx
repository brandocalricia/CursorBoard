"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DetailItem } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize";

type Props = {
  item: DetailItem | null;
  onClose: () => void;
  loading?: boolean;
};

export function DetailSheet({ item, onClose, loading }: Props) {
  const open = Boolean(item) || loading;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Dismiss detail overlay"
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={item?.title ?? "Details"}
            className="detail-sheet fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  {item?.source ?? "…"}
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
                  {loading && !item ? "Loading…" : item?.title}
                </h2>
                {item?.subtitle ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
                ) : null}
                {item?.meta?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.meta.map((m) => (
                      <span key={m} className="meta-chip">
                        {m}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div className="hd-scroll flex-1 overflow-auto px-6 py-5">
              {loading && !item?.bodyHtml && !item?.bodyText ? (
                <div className="space-y-3">
                  <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
                </div>
              ) : item?.bodyHtml ? (
                <div
                  className="prose-hd"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.bodyHtml) }}
                />
              ) : item?.bodyText ? (
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
                  {item.bodyText}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description available.</p>
              )}
            </div>

            {item?.linkUrl ? (
              <footer className="border-t border-border px-6 py-4">
                <a
                  href={item.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-accent inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
                >
                  {item.linkLabel ?? "Open original"}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
