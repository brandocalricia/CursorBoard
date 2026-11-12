"use client";

import { useCallback, useState } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { DetailSheet } from "@/components/dashboard/DetailSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { CanvasTokenBanner } from "@/components/dashboard/CanvasTokenBanner";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import type { CanvasPayload, DetailItem } from "@/lib/types";

export function CanvasWidget({
  onAuthStatus,
}: {
  onAuthStatus?: (payload: CanvasPayload) => void;
} = {}) {
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetcher = useCallback(async () => {
    const res = await fetch("/api/canvas", { cache: "no-store" });
    if (!res.ok) throw new Error("Couldn’t load Canvas");
    const json = (await res.json()) as CanvasPayload;
    onAuthStatus?.(json);
    return json;
  }, [onAuthStatus]);

  const { data, error, loading, refresh, updatedAt } = useLiveQuery({
    fetcher,
    intervalMs: 45_000,
  });

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

  const authBad =
    data?.authStatus === "token_expired" ||
    data?.authStatus === "unauthorized";

  return (
    <>
      <WidgetShell
        title="Canvas"
        description={
          updatedAt
            ? `Upcoming · refreshed ${format(updatedAt, "h:mm:ss a")}`
            : "Upcoming work — click a row for instructions"
        }
        loading={loading && !data}
        error={error}
        onRetry={() => void refresh()}
        sample={data?.sample}
        empty={!loading && !error && !authBad && !(data?.assignments.length)}
        emptyNode={
          <EmptyState
            illustration="empty"
            title="No upcoming assignments"
            body="When Canvas is connected, deadlines land here with instructions one click away."
          />
        }
      >
        {authBad ? (
          <CanvasTokenBanner
            status={data?.authStatus}
            message={data?.authMessage}
            canvasBaseUrl={data?.canvasBaseUrl}
            className="mb-3"
          />
        ) : null}
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
              due.getTime() - Date.now() < 2 * 86400_000;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  className="row-item"
                  onClick={() =>
                    void openDetail(a.id, {
                      id: a.id,
                      source: "canvas",
                      title: a.name,
                      subtitle: a.course,
                      meta: [
                        dueLabel,
                        a.points != null ? `${a.points} pts` : "",
                      ].filter(Boolean),
                      bodyText: a.descriptionText ?? "Loading instructions…",
                      linkUrl: a.htmlUrl,
                      linkLabel: "Open assignment in Canvas",
                    })
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {a.course}
                        {a.points != null ? ` · ${a.points} pts` : ""}
                      </p>
                      <p
                        className={`mt-1 flex items-center gap-1 text-[11px] ${
                          overdue
                            ? "text-[var(--danger)]"
                            : dueSoon
                              ? "text-[var(--warning)]"
                              : "text-muted-foreground"
                        }`}
                      >
                        <CalendarClock className="h-3 w-3" />
                        {dueLabel}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </WidgetShell>
      <DetailSheet
        item={detail}
        onClose={() => setDetail(null)}
        loading={detailLoading}
      />
    </>
  );
}
