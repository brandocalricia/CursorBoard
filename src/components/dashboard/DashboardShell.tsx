"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Settings2, WifiOff } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/providers/AppProviders";
import { CustomizationDrawer } from "@/components/dashboard/CustomizationDrawer";
import { GitHubWidget } from "@/components/widgets/GitHubWidget";
import { CanvasWidget } from "@/components/widgets/CanvasWidget";
import { EmailWidget } from "@/components/widgets/EmailWidget";
import { BriefsWidget } from "@/components/widgets/BriefsWidget";
import { HostWidget } from "@/components/widgets/HostWidget";
import { InternetWidget } from "@/components/widgets/InternetWidget";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Illustration } from "@/components/ui/Illustration";
import { WIDGET_META, type WidgetId } from "@/lib/widgets/registry-meta";
import { cn } from "@/lib/utils";

const COMPONENTS: Record<WidgetId, ComponentType> = {
  github: GitHubWidget,
  canvas: CanvasWidget,
  email: EmailWidget,
  briefs: BriefsWidget,
  host: HostWidget,
  speed: InternetWidget,
};

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

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
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

  const visible = useMemo(
    () => WIDGET_META.filter((w) => settings.enabledWidgets.includes(w.id)),
    [settings.enabledWidgets],
  );

  const cols =
    settings.layoutPreset === "focus"
      ? "xl:grid-cols-3"
      : settings.layoutPreset === "dense"
        ? "xl:grid-cols-6"
        : "xl:grid-cols-4";

  return (
    <div
      className={cn(
        "min-h-[100svh] px-4 py-6 sm:px-6 lg:px-8",
        `density-${settings.density}`,
      )}
    >
      <div className="mx-auto max-w-[1440px]">
        <motion.header
          className="hd-header mb-8 px-5 py-6 sm:px-8 sm:py-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <div className="hero-orb -left-20 -top-24 opacity-80" />
          <div className="hero-orb secondary -right-10 top-0 opacity-50" style={{ width: 200, height: 200 }} />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <span className="pulse-dot" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Local · live
                </span>
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                High Dashboard
              </h1>
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                {now
                  ? `${greetingFor(now)} · ${format(now, "EEEE, MMMM d · HH:mm")}`
                  : "Your local command center"}
              </p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Portfolio-grade ops surface — GitHub, Canvas, machine, internet, and briefs on this box.
              </p>
            </div>
            <div className="flex items-end gap-4">
              <Illustration
                name="analytics"
                className="hidden h-28 w-auto opacity-90 sm:block lg:h-36"
                alt=""
              />
              <div className="flex items-center gap-2 pb-1">
                {!online ? (
                  <span className="meta-chip gap-1.5 text-[var(--warning)]">
                    <WifiOff className="h-3 w-3" /> Offline
                  </span>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open customization"
                >
                  <Settings2 className="h-4 w-4" />
                  Customize
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-[1.4rem]" />
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
                {visible.map((w, index) => {
                  const Comp = COMPONENTS[w.id];
                  const span =
                    settings.layoutPreset === "dense"
                      ? Math.min(w.colSpan, 2)
                      : settings.layoutPreset === "focus" && w.id === "host"
                        ? 3
                        : w.colSpan;
                  return (
                    <motion.div
                      key={w.id}
                      layout
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 360,
                        damping: 30,
                      }}
                      className={cn(
                        span >= 2 && "md:col-span-2",
                        span >= 3 && "xl:col-span-3",
                        w.id === "host" &&
                          settings.layoutPreset === "balanced" &&
                          "xl:col-span-2",
                      )}
                    >
                      <Comp />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        )}

        {!loading && visible.length === 0 ? (
          <div className="hd-card mt-6">
            <EmptyState
              illustration="dashboard"
              title="All widgets are hidden"
              body="Open Customize and turn a few panels back on."
              action={
                <Button size="sm" variant="accent" onClick={() => setDrawerOpen(true)}>
                  Open Customize
                </Button>
              }
            />
          </div>
        ) : null}
      </div>

      <CustomizationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
