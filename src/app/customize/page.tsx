"use client";

import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, DotsSixVertical } from "@phosphor-icons/react";
import { useSettings } from "@/components/providers/AppProviders";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { AssembleTitle } from "@/components/ui/text-scroll-animation";
import {
  WIDGET_META,
  normalizeWidgetOrder,
  type WidgetId,
} from "@/lib/widgets/registry-meta";
import type { Density, LayoutPreset, ThemeMode, ThemePack, WidgetSpan } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCENTS = ["#5CEE15", "#14B8A6", "#22D3EE", "#E34D08", "#D9D9DA"];
const PACKS: { id: ThemePack; label: string }[] = [
  { id: "cryptozen", label: "CryptoZen Lime" },
  { id: "amber", label: "Amber Desk" },
  { id: "monokai", label: "Monokai Emerald" },
  { id: "horizon", label: "Horizon Steel" },
  { id: "obsidian", label: "Obsidian Silver" },
  { id: "daylight", label: "Daylight" },
];

function SortableRow({
  id,
  on,
  span,
  title,
  description,
  onToggle,
  onSpan,
}: {
  id: WidgetId;
  on: boolean;
  span: WidgetSpan;
  title: string;
  description: string;
  onToggle: () => void;
  onSpan: (s: WidgetSpan) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between",
        !on && "opacity-55",
        isDragging && "z-10 border-[var(--accent)] shadow-lg",
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-muted-foreground active:cursor-grabbing"
          aria-label={`Drag ${title}`}
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical size={18} weight="bold" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
        <div className="flex rounded-md border border-border p-0.5">
          {([1, 2, 3] as WidgetSpan[]).map((s) => (
            <button
              key={s}
              type="button"
              className={cn(
                "h-7 min-w-8 rounded px-2 text-xs font-semibold",
                span === s
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onSpan(s)}
            >
              {s}×
            </button>
          ))}
        </div>
        <button
          type="button"
          className={cn(
            "h-7 rounded-md border px-3 text-xs font-semibold",
            on
              ? "border-[color-mix(in_oklab,var(--accent)_40%,transparent)] text-[var(--accent)]"
              : "border-border text-muted-foreground",
          )}
          onClick={onToggle}
        >
          {on ? "On" : "Off"}
        </button>
      </div>
    </li>
  );
}

export default function CustomizePage() {
  const { settings, setSettings, toggleWidget, setWidgetSpan } = useSettings();
  const order = normalizeWidgetOrder(settings.widgetOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as WidgetId);
    const newIndex = order.indexOf(over.id as WidgetId);
    if (oldIndex < 0 || newIndex < 0) return;
    void setSettings({ widgetOrder: arrayMove(order, oldIndex, newIndex) });
  }

  return (
    <div className="zen-atmosphere min-h-[100svh]">
      <div className="zen-scan" aria-hidden />
      <div className="relative z-[2] mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-[var(--accent)]"
          >
            <ArrowLeft size={14} weight="bold" />
            Dashboard
          </Link>
          <AssembleTitle text="Layout studio" />
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Drag widgets into place, set column width, toggle visibility, and
            switch theme packs. Changes save instantly on this machine.
          </p>
        </div>

        <ContainerScroll
          titleComponent={
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Live grid preview
            </p>
          }
        >
          <div className="grid grid-cols-6 gap-1.5 p-3">
            {order
              .filter((id) => settings.enabledWidgets.includes(id))
              .map((id) => {
                const meta = WIDGET_META.find((w) => w.id === id)!;
                const span = (settings.widgetSpans?.[id] ??
                  Math.min(meta.colSpan, 3)) as WidgetSpan;
                return (
                  <div
                    key={id}
                    className="rounded-md border border-border bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-2 py-3 text-[10px] font-semibold uppercase tracking-wide text-foreground"
                    style={{ gridColumn: `span ${Math.min(span * 2, 6)}` }}
                  >
                    {meta.title}
                  </div>
                );
              })}
          </div>
        </ContainerScroll>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <section className="hd-card space-y-3 p-4 sm:p-5">
            <header className="mb-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Drag widgets
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Grab the handle to reorder. Span 1–3 controls width on large screens.
              </p>
            </header>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {order.map((id) => {
                    const meta = WIDGET_META.find((w) => w.id === id)!;
                    const on = settings.enabledWidgets.includes(id);
                    const span = (settings.widgetSpans?.[id] ??
                      Math.min(meta.colSpan, 3)) as WidgetSpan;
                    return (
                      <SortableRow
                        key={id}
                        id={id}
                        on={on}
                        span={span}
                        title={meta.title}
                        description={meta.description}
                        onToggle={() => void toggleWidget(id)}
                        onSpan={(s) => void setWidgetSpan(id, s)}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </section>

          <aside className="space-y-4">
            <section className="hd-card space-y-3 p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Theme pack
              </h2>
              <div className="grid gap-1.5">
                {PACKS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-xs font-semibold",
                      (settings.themePack ?? "cryptozen") === p.id
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => void setSettings({ themePack: p.id })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="hd-card space-y-3 p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Mode & accent
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {(["dark", "light", "system"] as ThemeMode[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs capitalize",
                      settings.theme === t
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-border text-muted-foreground",
                    )}
                    onClick={() => void setSettings({ theme: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-label={`Accent ${a}`}
                    className={cn(
                      "h-7 w-7 rounded-full border-2",
                      settings.accent.toLowerCase() === a.toLowerCase()
                        ? "border-foreground"
                        : "border-transparent",
                    )}
                    style={{ background: a }}
                    onClick={() =>
                      void setSettings({ accent: a, themePack: "cryptozen" })
                    }
                  />
                ))}
              </div>
            </section>

            <section className="hd-card space-y-3 p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Density & grid
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {(["compact", "comfortable", "spacious"] as Density[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs capitalize",
                      settings.density === d
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-border text-muted-foreground",
                    )}
                    onClick={() => void setSettings({ density: d })}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["focus", "balanced", "dense"] as LayoutPreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs capitalize",
                      settings.layoutPreset === p
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-border text-muted-foreground",
                    )}
                    onClick={() => void setSettings({ layoutPreset: p })}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </section>

            <Link
              href="/"
              className="btn-accent inline-flex h-10 w-full items-center justify-center rounded-md text-sm"
            >
              Back to live board
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
