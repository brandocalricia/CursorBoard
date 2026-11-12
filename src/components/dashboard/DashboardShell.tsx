"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { GearSix, SquaresFour, WifiSlash } from "@phosphor-icons/react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings } from "@/components/providers/AppProviders";
import { CustomizationDrawer } from "@/components/dashboard/CustomizationDrawer";
import { CanvasTokenBanner } from "@/components/dashboard/CanvasTokenBanner";
import { GitHubWidget } from "@/components/widgets/GitHubWidget";
import { CanvasWidget } from "@/components/widgets/CanvasWidget";
import { EmailWidget } from "@/components/widgets/EmailWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { LinksWidget } from "@/components/widgets/LinksWidget";
import { NotesWidget } from "@/components/widgets/NotesWidget";
import { FocusTimerWidget } from "@/components/widgets/FocusTimerWidget";
import { BriefsWidget } from "@/components/widgets/BriefsWidget";
import { HostWidget } from "@/components/widgets/HostWidget";
import { InternetWidget } from "@/components/widgets/InternetWidget";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  WIDGET_META,
  normalizeWidgetOrder,
  resolveWidgetSpan,
  type WidgetId,
} from "@/lib/widgets/registry-meta";
import type { CanvasPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

const COMPONENTS: Record<WidgetId, ComponentType> = {
  github: GitHubWidget,
  canvas: CanvasWidget,
  email: EmailWidget,
  calendar: CalendarWidget,
  weather: WeatherWidget,
  links: LinksWidget,
  notes: NotesWidget,
  focus: FocusTimerWidget,
  briefs: BriefsWidget,
  host: HostWidget,
  speed: InternetWidget,
};

const TICKER = [
  "Host telemetry · 2s poll",
  "Canvas · exact assignment links + token renew alert",
  "GitHub · activity & PRs with outbound links",
  "Internet · sustained multi-stream speed test (~22s)",
  "Weather · Open-Meteo from your location",
  "Layout · drag-and-drop on /customize",
  "Local-first · data stays on this machine",
];

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardShell() {
  const { settings, loading } = useSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [canvasAuth, setCanvasAuth] = useState<CanvasPayload | null>(null);

  const onCanvasAuth = useCallback((payload: CanvasPayload) => {
    setCanvasAuth(payload);
  }, []);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const orderedVisible = useMemo(() => {
    const order = normalizeWidgetOrder(settings.widgetOrder);
    return order
      .filter((id) => settings.enabledWidgets.includes(id))
      .map((id) => WIDGET_META.find((w) => w.id === id)!)
      .filter(Boolean);
  }, [settings.enabledWidgets, settings.widgetOrder]);

  const cols =
    settings.layoutPreset === "focus"
      ? "xl:grid-cols-3"
      : settings.layoutPreset === "dense"
        ? "xl:grid-cols-6"
        : "xl:grid-cols-4";

  const showTopBanner =
    canvasAuth?.authStatus === "token_expired" ||
    canvasAuth?.authStatus === "unauthorized";

  return (
    <TooltipProvider>
      <div className={cn("zen-atmosphere min-h-[100svh]", `density-${settings.density}`)}>
        <div className="zen-scan" aria-hidden />
        <div className="mx-auto flex min-h-[100svh] max-w-[1500px]">
          <aside className="zen-rail sticky top-0 hidden h-[100svh] w-[72px] shrink-0 flex-col items-center gap-6 py-5 md:flex">
            <div className="zen-mark" aria-hidden>
              H
            </div>
            <div className="flex flex-1 flex-col items-center gap-3 pt-2">
              {orderedVisible.slice(0, 8).map((w, i) => (
                <Tooltip key={w.id}>
                  <TooltipTrigger
                    className="rounded-full p-1"
                    aria-label={w.title}
                  >
                    <motion.span
                      className="block h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                      animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.28 }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{w.title}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/customize"
                    aria-label="Open full layout customize page"
                    className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <SquaresFour size={20} weight="bold" />
                  </Link>
                }
              />
              <TooltipContent>Layout studio</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Open customization"
                    onClick={() => setDrawerOpen(true)}
                  />
                }
              >
                <GearSix size={20} weight="bold" />
              </TooltipTrigger>
              <TooltipContent>Quick customize</TooltipContent>
            </Tooltip>
          </aside>

          <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-7">
            <header className="mb-4 border-b border-border pb-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="pulse-dot" aria-hidden />
                    <span className="shimmer text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                      Live
                    </span>
                    {now ? (
                      <span className="live-clock text-[11px] text-muted-foreground">
                        {format(now, "HH:mm:ss")}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    High Dashboard
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {now
                      ? `${greetingFor(now)} · ${format(now, "EEE, MMM d")}`
                      : "Local command center"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!online ? (
                    <span className="meta-chip gap-1 text-[var(--warning)]">
                      <WifiSlash size={12} /> Offline
                    </span>
                  ) : null}
                  <Link
                    href="/customize"
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <SquaresFour size={16} weight="bold" />
                    Layout
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open customization"
                  >
                    <GearSix size={16} weight="bold" />
                    Customize
                  </Button>
                </div>
              </div>

              <div className="ticker mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <div className="ticker-track">
                  {[...TICKER, ...TICKER].map((t, i) => (
                    <span key={`${t}-${i}`} className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </header>

            {showTopBanner ? (
              <CanvasTokenBanner
                status={canvasAuth?.authStatus}
                message={canvasAuth?.authMessage}
                canvasBaseUrl={canvasAuth?.canvasBaseUrl}
                className="mb-4"
              />
            ) : null}

            {loading ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-52 w-full rounded-[0.85rem]" />
                ))}
              </div>
            ) : (
              <LayoutGroup>
                <motion.div
                  layout
                  className={cn("grid grid-cols-1 md:grid-cols-2", cols)}
                  style={{ gap: "var(--density-gap)" }}
                >
                  <AnimatePresence mode="popLayout">
                    {orderedVisible.map((w, index) => {
                      const span = resolveWidgetSpan(
                        w.id,
                        settings.widgetSpans,
                        settings.layoutPreset,
                      );
                      const Comp = COMPONENTS[w.id];
                      return (
                        <motion.div
                          key={w.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: index * 0.03,
                            type: "spring",
                            stiffness: 420,
                            damping: 32,
                          }}
                          className={cn(
                            span >= 2 && "md:col-span-2",
                            span >= 3 && "xl:col-span-3",
                            span === 2 &&
                              settings.layoutPreset === "balanced" &&
                              "xl:col-span-2",
                          )}
                        >
                          {w.id === "canvas" ? (
                            <CanvasWidget onAuthStatus={onCanvasAuth} />
                          ) : (
                            <Comp />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            )}

            {!loading && orderedVisible.length === 0 ? (
              <div className="hd-card mt-6">
                <EmptyState
                  title="All widgets are hidden"
                  body="Open Layout to turn panels back on and arrange the grid."
                  action={
                    <Link
                      href="/customize"
                      className="btn-accent inline-flex h-8 items-center rounded-md px-3 text-sm"
                    >
                      Open Layout
                    </Link>
                  }
                />
              </div>
            ) : null}
          </div>
        </div>

        <CustomizationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
