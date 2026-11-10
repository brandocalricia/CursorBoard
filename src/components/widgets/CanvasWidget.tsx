"use client";

import { useEffect, useState } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { DetailSheet } from "@/components/dashboard/DetailSheet";
import type { CanvasPayload, DetailItem } from "@/lib/types";

export function CanvasWidget() {
  const [data, setData] = useState<CanvasPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/canvas", { cache: "no-store" });
        if (!res.ok) throw new Error("Couldn’t load Canvas");
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

  async function openDetail(id: string, fallback: DetailItem) {
    setDetail(fallback);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/canvas/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const full = (await res.json()) as DetailItem;
        setDetail(full);
      }
    } catch {
      /* keep fallback */
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <>
      <WidgetShell
        title="Canvas"
        description="Upcoming work — click a row for instructions"
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
                ? `${format(due, "MMM d · h:mm a")} · ${formatDistanceToNow(due, { addSuffix: true })}`
                : "No due date";
            const overdue = due && isValid(due) && due.getTime() < Date.now();
            const dueSoon =
              due &&
              isValid(due) &&
              !overdue &&
              due.getTime() - Date.now() < 36 * 3600_000;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  className="row-item group"
                  onClick={() =>
                    void openDetail(a.id, {
                      id: a.id,
                      source: "canvas",
                      title: a.name,
                      subtitle: a.course,
                      meta: [
                        dueLabel,
                        a.points != null ? `${a.points} pts` : "",
                        overdue ? "Overdue" : dueSoon ? "Due soon" : "",
                      ].filter(Boolean),
                      bodyHtml: a.descriptionHtml,
                      bodyText:
                        a.descriptionText ||
                        "Loading full instructions…",
                      linkUrl: a.htmlUrl !== "#" ? a.htmlUrl : undefined,
                      linkLabel: "Open in Canvas",
                    })
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium leading-snug text-foreground">
                        {a.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{a.course}</p>
                      <p
                        className={`mt-2 flex items-center gap-1.5 text-[12px] ${
                          overdue
                            ? "text-[var(--danger)]"
                            : dueSoon
                              ? "text-[var(--warning)]"
                              : "text-muted-foreground"
                        }`}
                      >
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        {dueLabel}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {a.points != null ? (
                        <span className="rounded-lg bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)]">
                          {a.points} pts
                        </span>
                      ) : null}
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </WidgetShell>
      <DetailSheet
        item={detail}
        loading={detailLoading}
        onClose={() => {
          setDetail(null);
          setDetailLoading(false);
        }}
      />
    </>
  );
}
