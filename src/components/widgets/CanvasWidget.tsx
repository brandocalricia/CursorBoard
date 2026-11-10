"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import type { CanvasPayload } from "@/lib/types";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

export function CanvasWidget() {
  const [data, setData] = useState<CanvasPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/canvas", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load Canvas");
        const json = (await res.json()) as CanvasPayload;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetShell
      title="Canvas"
      description="Assignments & deadlines"
      loading={loading}
      error={error}
      sample={data?.sample}
      empty={!loading && !error && !(data?.assignments.length)}
      emptyMessage="No upcoming assignments"
    >
      <ul className="space-y-2">
        {(data?.assignments ?? []).map((a) => {
          const due = a.dueAt ? parseISO(a.dueAt) : null;
          const dueLabel =
            due && isValid(due)
              ? `${format(due, "MMM d, h:mm a")} · ${formatDistanceToNow(due, { addSuffix: true })}`
              : "No due date";
          return (
            <li key={a.id}>
              <a
                href={a.htmlUrl}
                className="flex items-start justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.course}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    {dueLabel}
                  </p>
                </div>
                {a.points != null ? (
                  <span className="rounded-md bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] px-2 py-1 text-[11px] font-medium text-[var(--accent)]">
                    {a.points} pts
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </WidgetShell>
  );
}
