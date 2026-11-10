"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { DetailSheet } from "@/components/dashboard/DetailSheet";
import type { DetailItem, EmailPayload } from "@/lib/types";

const SAMPLE: EmailPayload = {
  sample: true,
  messages: [
    {
      id: "e1",
      from: "Canvas Notifications",
      subject: "New announcement in CS 320",
      preview: "Office hours moved to Thursday 2–4pm in ECCR 1B50…",
      bodyText:
        "Office hours moved to Thursday 2–4pm in ECCR 1B50.\n\nBring questions on concurrent structures and the midterm review sheet.",
      receivedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
      unread: true,
      priority: "high",
      htmlUrl: "https://mail.google.com",
    },
    {
      id: "e2",
      from: "GitHub",
      subject: "[brandocalricia/CursorBoard] PR review requested",
      preview: "A teammate requested your review on High Dashboard…",
      bodyText:
        "A teammate requested your review on High Dashboard (#1).\n\nOpen the pull request to leave comments.",
      receivedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
      unread: true,
      priority: "normal",
      htmlUrl: "https://github.com/brandocalricia/CursorBoard/pull/1",
    },
    {
      id: "e3",
      from: "DU Career Services",
      subject: "Portfolio workshop this week",
      preview: "Join Thursday’s walkthrough for CS portfolio reviews…",
      bodyText:
        "Join Thursday’s walkthrough for CS portfolio reviews. Bring a laptop and one project you want feedback on.",
      receivedAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
      unread: false,
      priority: "low",
    },
  ],
};

export function EmailWidget() {
  const [data, setData] = useState<EmailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailItem | null>(null);

  useEffect(() => {
    // Live Gmail provider lands with Composio later — sample keeps the panel usable.
    setData(SAMPLE);
    setLoading(false);
  }, []);

  return (
    <>
      <WidgetShell
        title="Email"
        description="Unread & priority"
        loading={loading}
        sample={data?.sample}
        empty={!loading && !(data?.messages.length)}
        emptyMessage="Inbox is quiet"
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
                      bodyText: m.bodyText ?? m.preview,
                      bodyHtml: m.bodyHtml,
                      linkUrl: m.htmlUrl,
                      linkLabel: "Open in mail",
                    })
                  }
                >
                  <div className="flex items-start gap-3">
                    <Mail
                      className={`mt-0.5 h-4 w-4 shrink-0 ${m.unread ? "text-[var(--accent)]" : "text-muted-foreground"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`truncate text-sm ${m.unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
                          {m.from}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{ago}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-foreground">{m.subject}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.preview}</p>
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
