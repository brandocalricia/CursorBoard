"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/providers/AppProviders";
import { WIDGET_META } from "@/lib/widgets/registry-meta";
import type { Density, LayoutPreset, ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/hooks/useEscapeKey";

const ACCENTS = ["#5CEE15", "#14B8A6", "#22D3EE", "#E34D08", "#D9D9DA"];

const THEME_LABELS: Record<ThemeMode, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
};

const DENSITY_LABELS: Record<Density, string> = {
  compact: "Compact",
  comfortable: "Comfortable",
  spacious: "Spacious",
};

const LAYOUT_LABELS: Record<LayoutPreset, { label: string; hint: string }> = {
  focus: { label: "Focus", hint: "Fewer, wider panels" },
  balanced: { label: "Balanced", hint: "Default grid" },
  dense: { label: "Dense", hint: "More columns on large screens" },
};

type Props = { open: boolean; onClose: () => void };

export function CustomizationDrawer({ open, onClose }: Props) {
  const { settings, setSettings, toggleWidget } = useSettings();
  const onEscape = useCallback(() => onClose(), [onClose]);
  useEscapeKey(open, onEscape);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Dismiss settings overlay"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Customize"
            className="hd-card fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-border"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            style={{ borderRadius: 0, padding: "var(--density-pad)" }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Customize</h2>
                <p className="text-sm text-muted-foreground">Theme, density, widgets</p>
              </div>
              <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="hd-scroll space-y-8 overflow-auto pr-1">
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Theme
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(["dark", "light", "system"] as ThemeMode[]).map((theme) => (
                    <Button
                      key={theme}
                      size="sm"
                      variant={settings.theme === theme ? "accent" : "outline"}
                      onClick={() => void setSettings({ theme })}
                    >
                      {THEME_LABELS[theme]}
                    </Button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Accent
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      aria-label={`Accent ${accent}`}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
                        settings.accent === accent ? "border-foreground" : "border-transparent",
                      )}
                      style={{ background: accent }}
                      onClick={() => void setSettings({ accent })}
                    />
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Density
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(["compact", "comfortable", "spacious"] as Density[]).map((density) => (
                    <Button
                      key={density}
                      size="sm"
                      variant={settings.density === density ? "accent" : "outline"}
                      onClick={() => void setSettings({ density })}
                    >
                      {DENSITY_LABELS[density]}
                    </Button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Layout
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(["focus", "balanced", "dense"] as LayoutPreset[]).map((layoutPreset) => (
                    <Button
                      key={layoutPreset}
                      size="sm"
                      variant={settings.layoutPreset === layoutPreset ? "accent" : "outline"}
                      onClick={() => void setSettings({ layoutPreset })}
                      title={LAYOUT_LABELS[layoutPreset].hint}
                    >
                      {LAYOUT_LABELS[layoutPreset].label}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {LAYOUT_LABELS[settings.layoutPreset].hint}
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Widgets
                </h3>
                <ul className="space-y-2">
                  {WIDGET_META.map((w) => {
                    const on = settings.enabledWidgets.includes(w.id);
                    return (
                      <li
                        key={w.id}
                        className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{w.title}</p>
                          <p className="text-xs text-muted-foreground">{w.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={on ? "accent" : "outline"}
                          onClick={() => void toggleWidget(w.id)}
                          aria-pressed={on}
                        >
                          {on ? "On" : "Off"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">Local automations</p>
                <p className="mt-1">
                  Install timers: <code>agents/install-timers.sh</code>
                </p>
                <p className="mt-1">
                  One-shot: <code>agents/run-all-once.sh</code> or use{" "}
                  <strong className="text-foreground">Briefs → Run once</strong>.
                </p>
                <p className="mt-2">
                  Desktop builds: <code>npm run desktop:build</code> (AppImage / DMG / MSI).
                </p>
              </section>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
