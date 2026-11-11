"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { GearSix, WifiSlash } from "@phosphor-icons/react";
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
        "min-h-[100svh]",
        `density-${settings.density}`,
      )}
    >
      <div className="mx-auto flex min-h-[100svh] max-w-[1500px]">
        {/* Left rail — ZenWallet trading-desk cue */}
        <aside className="zen-rail sticky top-0 hidden h-[100svh] w-[72px] shrink-0 flex-col items-center gap-6 py-5 md:flex">
          <div className="zen-mark" aria-hidden>
            H
          </div>
          <div className="flex flex-1 flex-col items-center gap-3 pt-2">
            {visible.slice(0, 6).map((w) => (
              <span
                key={w.id}
                title={w.title}
                className="h-1.5 w-1.5 rounded-full bg-[color-mix(in_oklab,var(--muted-foreground)_55%,transparent)]"
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Open customization"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => setDrawerOpen(true)}
          >
            <GearSix size={20} weight="bold" />
          </button>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-7">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="pulse-dot" aria-hidden />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Live
                </span>
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                High Dashboard
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {now
                  ? `${greetingFor(now)} · ${format(now, "EEE, MMM d · HH:mm")}`
                  : "Local command center"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!online ? (
                <span className="meta-chip gap-1 text-[var(--warning)]">
                  <WifiSlash size={12} /> Offline
                </span>
              ) : null}
              <Button
                variant="outline"
                className="md:hidden"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open customization"
              >
                <GearSix size={16} weight="bold" />
                Customize
              </Button>
            </div>
          </header>

          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: index * 0.04,
                          type: "spring",
                          stiffness: 420,
                          damping: 32,
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
      </div>

      <CustomizationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
