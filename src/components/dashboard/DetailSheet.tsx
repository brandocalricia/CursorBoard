"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowSquareOut, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { DetailItem } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize";
import { withGuaranteedLinks } from "@/lib/detail-links";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type Props = {
  item: DetailItem | null;
  onClose: () => void;
  loading?: boolean;
};

export function DetailSheet({ item, onClose, loading }: Props) {
  const open = Boolean(item) || Boolean(loading);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const onEscape = useCallback(() => onClose(), [onClose]);
  useEscapeKey(open, onEscape);

  const enriched = useMemo(
    () => (item ? withGuaranteedLinks(item) : null),
    [item],
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Dismiss detail overlay"
            className="fixed inset-0 z-50 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={enriched?.title ?? "Details"}
            className="detail-sheet fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  {enriched?.source ?? "…"}
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
                  {loading && !enriched ? "Loading…" : enriched?.title}
                </h2>
                {enriched?.subtitle ? (
                  <p className="mt-1 text-sm text-muted-foreground">{enriched.subtitle}</p>
                ) : null}
                {enriched?.meta?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {enriched.meta.map((m) => (
                      <span key={m} className="meta-chip">
                        {m}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button
                ref={closeBtnRef}
                size="icon"
                variant="ghost"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" weight="bold" />
              </Button>
            </header>

            <div className="hd-scroll flex-1 overflow-auto px-6 py-5">
              {loading && !enriched?.bodyHtml && !enriched?.bodyText ? (
                <div className="space-y-3">
                  <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
                </div>
              ) : enriched?.bodyHtml ? (
                <div
                  className="prose-hd"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(enriched.bodyHtml) }}
                />
              ) : enriched?.bodyText ? (
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
                  {enriched.bodyText}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description available.</p>
              )}
            </div>

            {enriched?.links?.length ? (
              <footer className="space-y-3 border-t border-border px-6 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Open on the real site
                </p>
                <ul className="space-y-2">
                  {enriched.links.map((link, i) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className={
                          i === 0
                            ? "btn-accent inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm"
                            : "inline-flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground transition hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
                        }
                      >
                        <span className="min-w-0 truncate font-medium">{link.label}</span>
                        <ArrowSquareOut className="h-4 w-4 shrink-0" weight="bold" />
                      </a>
                      <p className="mt-1 truncate px-0.5 font-mono text-[11px] text-muted-foreground">
                        {link.url}
                      </p>
                    </li>
                  ))}
                </ul>
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
