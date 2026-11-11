"use client";

import { useCallback, useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { DetailSheet } from "@/components/dashboard/DetailSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import type { CalendarPayload, DetailItem } from "@/lib/types";

export function CalendarWidget() {
  const [detail, setDetail] = useState<DetailItem | null>(null);

  const fetcher = useCallback(async () => {
    const res = await fetch("/api/calendar", { cache: "no-store" });
    if (!res.ok) throw new Error("Couldn’t load calendar");
    return (await res.json()) as CalendarPayload;
  }, []);

  const { data, error, loading, refresh, updatedAt } = useLiveQuery({
    fetcher,
    intervalMs: 60_000,
  });

  return (
    <>
      <WidgetShell
        title="Calendar"
        description={
          updatedAt
            ? `Upcoming · updated ${format(updatedAt, "h:mm:ss a")}`
            : "Upcoming Google Calendar events"
        }
        loading={loading && !data}
        error={error}
        onRetry={() => void refresh()}
        sample={data?.sample}
        empty={!loading && !error && !(data?.events.length)}
        emptyNode={
          <EmptyState
            illustration="empty"
            title={data?.configured === false ? "Calendar not connected" : "No upcoming events"}
            body={
              data?.message ??
              "When Google Calendar is live via Composio (Platform ak_ key), events appear here with exact event links."
            }
          />
        }
      >
        <ul className="space-y-2">
          {(data?.events ?? []).map((ev) => {
            const start = parseISO(ev.start);
            const when = isValid(start) ? format(start, "EEE MMM d · h:mm a") : ev.start;
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  className="row-item"
                  onClick={() =>
                    setDetail({
                      id: ev.id,
                      source: "calendar",
                      title: ev.title,
                      subtitle: ev.location ?? undefined,
                      meta: [when],
                      bodyText: ev.description ?? "No description.",
                      linkUrl: ev.htmlLink,
                      linkLabel: "Open event in Google Calendar",
                    })
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{ev.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {when}
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
      <DetailSheet item={detail} onClose={() => setDetail(null)} />
    </>
  );
}
