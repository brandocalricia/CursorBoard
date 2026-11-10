"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/providers/AppProviders";
import { WIDGET_META } from "@/lib/widgets/registry-meta";
import type { Density, LayoutPreset, ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCENTS = ["#14B8A6", "#22D3EE", "#38BDF8", "#34D399", "#F59E0B", "#F472B6"];

type Props = { open: boolean; onClose: () => void };

export function CustomizationDrawer({ open, onClose }: Props) {
  const { settings, setSettings, toggleWidget } = useSettings();

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close settings overlay"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
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
                      {theme}
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
                      {density}
                    </Button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Layout preset
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(["focus", "balanced", "dense"] as LayoutPreset[]).map((layoutPreset) => (
                    <Button
                      key={layoutPreset}
                      size="sm"
                      variant={settings.layoutPreset === layoutPreset ? "accent" : "outline"}
                      onClick={() => void setSettings({ layoutPreset })}
                    >
                      {layoutPreset}
                    </Button>
                  ))}
                </div>
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
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
