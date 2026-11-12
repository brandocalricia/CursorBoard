"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { Newspaper, Play, RefreshCw } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { DetailSheet } from "@/components/dashboard/DetailSheet";
import { Button } from "@/components/ui/button";
import type { DetailItem } from "@/lib/types";

type Digest = {
  id: number;
  kind: string;
  title: string;
  body_md: string;
  created_at: string;
};

type AutomationsPayload = {
  pulses: Array<{
    id: string;
    label: string;
    schedule: string;
    lastAt?: string | null;
    lastTitle?: string;
    help: string;
  }>;
  composioConfigured: boolean;
  githubConfigured: boolean;
  canvasManualConfigured?: boolean;
};

const POLL_MS = 45_000;
const AUTO_WARM_MS = 10 * 60_000;

export function BriefsWidget() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [autos, setAutos] = useState<AutomationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [autoNote, setAutoNote] = useState<string | null>(null);
  const warmInFlight = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [dRes, aRes] = await Promise.all([
        fetch("/api/digests", { cache: "no-store" }),
        fetch("/api/automations", { cache: "no-store" }),
      ]);
      if (!dRes.ok) throw new Error("Couldn’t load briefs");
      const dJson = (await dRes.json()) as { digests: Digest[] };
      setDigests(dJson.digests ?? []);
      if (aRes.ok) setAutos((await aRes.json()) as AutomationsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  const runWarm = useCallback(async () => {
    if (warmInFlight.current) return;
    warmInFlight.current = true;
    try {
      // Lightweight keep-alive while the desk is open
      await fetch("/api/automations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "feed-warm" }),
      });
      await fetch("/api/automations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "canvas-sync" }),
      });
      setAutoNote(`Auto-synced ${new Date().toLocaleTimeString()}`);
      await load(true);
    } catch {
      /* ignore background failures */
    } finally {
      warmInFlight.current = false;
    }
  }, [load]);

  useEffect(() => {
    void load(false);
    const poll = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(poll);
  }, [load]);

  useEffect(() => {
    // Kick once shortly after mount, then every 10 minutes while tab is open
    const first = window.setTimeout(() => void runWarm(), 8_000);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void runWarm();
    }, AUTO_WARM_MS);
    const onFocus = () => void runWarm();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [runWarm]);

  async function runAll() {
    setRunning(true);
    try {
      await fetch("/api/automations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "all" }),
      });
      await load(false);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <WidgetShell
        title="Briefs & automations"
        description={
          autoNote
            ? `Live desk sync · ${autoNote}`
            : "Timers + auto-warm every 10m while this page is open"
        }
        loading={loading && !digests.length}
        error={error}
        onRetry={() => void load(false)}
        empty={!loading && !error && digests.length === 0}
        emptyMessage="No briefs yet. Click Run once (or install launchd/systemd timers)."
        actions={
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void load(false)}
              aria-label="Refresh briefs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="accent"
              disabled={running}
              onClick={() => void runAll()}
              aria-label="Run all automations once"
            >
              {running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run once
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {autos?.pulses?.length ? (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {autos.pulses.map((p) => {
                const when = p.lastAt ? parseISO(p.lastAt) : null;
                const ago =
                  when && isValid(when)
                    ? formatDistanceToNow(when, { addSuffix: true })
                    : "Never";
                return (
                  <li
                    key={p.id}
                    className="rounded-xl bg-muted/40 px-2.5 py-1.5"
                  >
                    <p className="text-xs font-medium leading-snug text-foreground">{p.label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                      {p.schedule} · {ago}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {!autos?.composioConfigured && !autos?.githubConfigured ? (
            <p className="rounded-lg bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] px-2.5 py-1.5 text-[11px] leading-snug text-muted-foreground">
              Timers need the app running. On Mac:{" "}
              <code className="text-foreground">./agents/install-launchd.sh</code>
            </p>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Newspaper className="h-3.5 w-3.5" /> Recent briefs
            </div>
            <ul className="space-y-1">
              {digests.slice(0, 6).map((d) => {
                const when = parseISO(d.created_at);
                const ago = isValid(when)
                  ? formatDistanceToNow(when, { addSuffix: true })
                  : "";
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="row-item py-2"
                      onClick={() => {
                        const kind = d.kind.toLowerCase();
                        const links =
                          kind.includes("canvas")
                            ? [
                                {
                                  url: "https://canvas.du.edu",
                                  label: "Open Canvas",
                                },
                              ]
                            : kind.includes("github")
                              ? [
                                  {
                                    url: "https://github.com/brandocalricia/CursorBoard",
                                    label: "Open this repo",
                                  },
                                ]
                              : [
                                  {
                                    url: "https://github.com/brandocalricia/CursorBoard",
                                    label: "Open project repo",
                                  },
                                ];
                        setDetail({
                          id: String(d.id),
                          source: "system",
                          title: d.title,
                          subtitle: d.kind.replace(/_/g, " "),
                          meta: [ago].filter(Boolean),
                          bodyText: d.body_md,
                          linkUrl: links[0]!.url,
                          linkLabel: links[0]!.label,
                          links,
                        });
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-foreground">{d.title}</p>
                        {ago ? (
                          <span className="shrink-0 text-[10px] text-muted-foreground">{ago}</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-muted-foreground">
                        {d.body_md.replace(/[#*_`]/g, "").slice(0, 100)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </WidgetShell>
      <DetailSheet item={detail} onClose={() => setDetail(null)} />
    </>
  );
}
