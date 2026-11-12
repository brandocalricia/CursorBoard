"use client";

import { useCallback, useState } from "react";
import { Mail } from "lucide-react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { DetailSheet } from "@/components/dashboard/DetailSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import type { DetailItem, EmailPayload } from "@/lib/types";

export function EmailWidget() {
  const [detail, setDetail] = useState<DetailItem | null>(null);

  const fetcher = useCallback(async () => {
    const res = await fetch("/api/email", { cache: "no-store" });
    if (!res.ok) throw new Error("Couldn’t load email");
    return (await res.json()) as EmailPayload;
  }, []);

  const { data, error, loading, refresh } = useLiveQuery({
    fetcher,
    intervalMs: 45_000,
  });

  return (
    <>
      <WidgetShell
        title="Email"
        description="Gmail inbox · exact thread links"
        loading={loading && !data}
        error={error}
        onRetry={() => void refresh()}
        sample={data?.sample}
        empty={!loading && !error && !(data?.messages.length)}
        emptyNode={
          <EmptyState
            illustration="mailbox"
            title={data?.configured === false ? "Gmail not connected" : "Inbox is quiet"}
            body={
              data?.message ??
              "Connect Gmail with COMPOSIO_API_KEY (ak_…) or GMAIL_USER + GMAIL_APP_PASSWORD. School Outlook stays blocked by DU admin consent."
            }
          />
        }
      >
        <ul className="space-y-2">
          {(data?.messages ?? []).map((m) => {
            const when = parseISO(m.receivedAt);
            const ago = isValid(when)
              ? formatDistanceToNow(when, { addSuffix: true })
              : "";
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className="row-item"
                  onClick={() =>
                    setDetail({
                      id: m.id,
                      source: "email",
                      title: m.subject,
                      subtitle: m.from,
                      meta: [
                        ago,
                        m.unread ? "Unread" : "Read",
                        m.priority === "high" ? "Priority" : "",
                      ].filter(Boolean),
                      bodyHtml: m.bodyHtml,
                      bodyText: m.bodyText ?? m.preview,
                      linkUrl: m.htmlUrl,
                      linkLabel: "Open thread in Gmail",
                    })
                  }
                >
                  <div className="flex items-start gap-2">
                    <Mail
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        m.unread ? "text-[var(--accent)]" : "text-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.from} · {ago}
                      </p>
                    </div>
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
