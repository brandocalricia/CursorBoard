"use client";

import { useEffect, useState } from "react";
import { KeyRound, X } from "lucide-react";
import type { CanvasAuthStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "hd-canvas-token-banner-dismissed";

type Props = {
  status?: CanvasAuthStatus;
  message?: string;
  canvasBaseUrl?: string;
  className?: string;
};

const RENEWAL_STEPS = [
  {
    n: 1,
    title: "Open Canvas settings",
    body: "In your browser, open Account → Settings (profile menu, top-right).",
  },
  {
    n: 2,
    title: "Create a new access token",
    body: "Scroll to Approved Integrations → New Access Token. Purpose: High Dashboard. Leave expires blank or pick ~30 days.",
  },
  {
    n: 3,
    title: "Copy the token once",
    body: "Canvas shows the full token only once. Copy it now — you cannot view it again.",
  },
  {
    n: 4,
    title: "Paste into .env.local",
    body: "In your CursorBoard folder, edit .env.local and set CANVAS_API_TOKEN=… (no quotes). Keep CANVAS_BASE_URL=https://canvas.du.edu.",
  },
  {
    n: 5,
    title: "Restart the app",
    body: "Stop the server (Ctrl+C), then run npm run build && npm start (or npm run dev). Hard-refresh the dashboard.",
  },
];

export function CanvasTokenBanner({
  status,
  message,
  canvasBaseUrl = "https://canvas.du.edu",
  className,
}: Props) {
  const needsBanner =
    status === "token_expired" ||
    status === "unauthorized" ||
    status === "token_missing";

  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!needsBanner) {
      setDismissed(false);
      return;
    }
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      // Re-show if status changed to expired this session
      if (raw === status) setDismissed(true);
      else setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, [needsBanner, status]);

  if (!needsBanner || dismissed) return null;

  const settingsUrl = `${canvasBaseUrl.replace(/\/$/, "")}/profile/settings`;
  const headline =
    status === "token_expired" || status === "unauthorized"
      ? "Canvas token expired (~30 days)"
      : "Canvas token not configured";

  return (
    <aside
      role="alert"
      aria-live="polite"
      className={cn(
        "hd-card relative overflow-hidden border-[color-mix(in_oklab,var(--warning)_45%,transparent)] bg-[color-mix(in_oklab,var(--warning)_8%,var(--card))]",
        className,
      )}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[var(--warning)]">
          <KeyRound className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-foreground">
                {headline}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {message ??
                  "DU Canvas access tokens expire about every 30 days. Follow the steps below to renew — takes about 2 minutes."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Hide steps" : "Show steps"}
              </button>
              <button
                type="button"
                aria-label="Dismiss for this session"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => {
                  try {
                    sessionStorage.setItem(DISMISS_KEY, status ?? "");
                  } catch {
                    /* ignore */
                  }
                  setDismissed(true);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {expanded ? (
            <ol className="mt-4 space-y-3">
              {RENEWAL_STEPS.map((step) => (
                <li key={step.n} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-[var(--accent-foreground)]">
                    {step.n}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={settingsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-accent inline-flex h-9 items-center rounded-md px-3 text-sm font-medium"
            >
              Open Canvas → New Access Token
            </a>
            <a
              href={`${canvasBaseUrl.replace(/\/$/, "")}/`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              Open Canvas home
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
