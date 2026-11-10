"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/providers/AppProviders";
import { CustomizationDrawer } from "@/components/dashboard/CustomizationDrawer";
import { GitHubWidget } from "@/components/widgets/GitHubWidget";
import { CanvasWidget } from "@/components/widgets/CanvasWidget";
import { HostWidget } from "@/components/widgets/HostWidget";
import { NetworkWidget } from "@/components/widgets/NetworkWidget";
import { WIDGET_META, type WidgetId } from "@/lib/widgets/registry-meta";
import { cn } from "@/lib/utils";

const COMPONENTS: Record<WidgetId, ComponentType> = {
  github: GitHubWidget,
  canvas: CanvasWidget,
  host: HostWidget,
  network: NetworkWidget,
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

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
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
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              High Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {now ? greetingFor(now) : "Welcome"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {now
                ? `${format(now, "EEEE, MMMM d · HH:mm")} · local command center`
                : "Local command center"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open customization"
          >
            <Settings2 className="h-4 w-4" />
            Customize
          </Button>
        </header>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="hd-card h-48 animate-pulse bg-muted/40" />
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
                {visible.map((w) => {
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
                      className={cn(
                        span >= 2 && "md:col-span-2",
                        span >= 3 && "xl:col-span-3",
                        w.id === "host" && settings.layoutPreset === "balanced" && "xl:col-span-2",
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
          <div className="hd-card mt-6 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              All widgets are hidden. Open Customize to turn some back on.
            </p>
          </div>
        ) : null}
      </div>

      <CustomizationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
