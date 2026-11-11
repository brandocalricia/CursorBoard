"use client";

import Link from "next/link";
import { ArrowLeft, CaretDown, CaretUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/providers/AppProviders";
import {
  WIDGET_META,
  normalizeWidgetOrder,
  type WidgetId,
} from "@/lib/widgets/registry-meta";
import type { Density, LayoutPreset, ThemeMode, WidgetSpan } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCENTS = ["#5CEE15", "#14B8A6", "#22D3EE", "#E34D08", "#D9D9DA"];

export default function CustomizePage() {
  const { settings, setSettings, toggleWidget, moveWidget, setWidgetSpan } =
    useSettings();
  const order = normalizeWidgetOrder(settings.widgetOrder);

  return (
    <div className="zen-atmosphere min-h-[100svh]">
      <div className="zen-scan" aria-hidden />
      <div className="relative z-[2] mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-[var(--accent)]"
            >
              <ArrowLeft size={14} weight="bold" />
              Dashboard
            </Link>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              Layout studio
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Reorder every panel, set column width, toggle visibility, and tune
              theme density. Changes save instantly to this machine.
            </p>
          </div>
          <Link
            href="/"
            className="btn-accent inline-flex h-9 items-center rounded-md px-4 text-sm"
          >
            Back to live board
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <section className="hd-card space-y-3 p-4 sm:p-5">
            <header className="mb-2 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Widget order & size
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Up/down moves position. Span 1–3 controls width on large screens.
                </p>
              </div>
            </header>

            <ul className="space-y-2">
              {order.map((id, index) => {
                const meta = WIDGET_META.find((w) => w.id === id)!;
                const on = settings.enabledWidgets.includes(id);
                const span = (settings.widgetSpans?.[id] ??
                  Math.min(meta.colSpan, 3)) as WidgetSpan;
                return (
                  <li
                    key={id}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between",
                      !on && "opacity-55",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{meta.title}</p>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={`Move ${meta.title} up`}
                          disabled={index === 0}
                          onClick={() => void moveWidget(id as WidgetId, -1)}
                        >
                          <CaretUp size={16} weight="bold" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={`Move ${meta.title} down`}
                          disabled={index === order.length - 1}
                          onClick={() => void moveWidget(id as WidgetId, 1)}
                        >
                          <CaretDown size={16} weight="bold" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        {([1, 2, 3] as WidgetSpan[]).map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant={span === s ? "accent" : "outline"}
                            onClick={() => void setWidgetSpan(id as WidgetId, s)}
                            aria-label={`Span ${s} for ${meta.title}`}
                          >
                            {s}×
                          </Button>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant={on ? "accent" : "outline"}
                        onClick={() => void toggleWidget(id)}
                        aria-pressed={on}
                      >
                        {on ? "On" : "Off"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <aside className="space-y-4">
            <section className="hd-card space-y-3 p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Theme
              </h2>
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
              <div className="flex flex-wrap gap-2 pt-1">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    aria-label={`Accent ${accent}`}
                    className={cn(
                      "h-8 w-8 rounded-md border-2 transition-transform hover:scale-105",
                      settings.accent === accent ? "border-foreground" : "border-transparent",
                    )}
                    style={{ background: accent }}
                    onClick={() => void setSettings({ accent })}
                  />
                ))}
              </div>
            </section>

            <section className="hd-card space-y-3 p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Density
              </h2>
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

            <section className="hd-card space-y-3 p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Grid preset
              </h2>
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
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Preset sets the column count. Per-widget span overrides still apply.
              </p>
            </section>

            <section className="hd-card space-y-2 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Preview</p>
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${
                    settings.layoutPreset === "dense"
                      ? 6
                      : settings.layoutPreset === "focus"
                        ? 3
                        : 4
                  }, minmax(0, 1fr))`,
                }}
              >
                {order
                  .filter((id) => settings.enabledWidgets.includes(id))
                  .map((id) => {
                    const meta = WIDGET_META.find((w) => w.id === id)!;
                    const span =
                      settings.widgetSpans?.[id] ?? Math.min(meta.colSpan, 3);
                    return (
                      <div
                        key={id}
                        className="rounded-sm bg-[color-mix(in_oklab,var(--accent)_22%,var(--muted))] px-1.5 py-2 text-[9px] font-semibold uppercase tracking-wide text-foreground"
                        style={{ gridColumn: `span ${span}` }}
                      >
                        {meta.title}
                      </div>
                    );
                  })}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
