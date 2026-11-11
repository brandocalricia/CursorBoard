import type { EmailPayload } from "../types";
import { composioExecute, isComposioConfigured } from "../composio";

function gmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(threadId)}`;
}

type RawMsg = Record<string, unknown>;

function pickMessages(data: unknown): RawMsg[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  for (const key of ["messages", "data", "response_data", "items"]) {
    const v = obj[key];
    if (Array.isArray(v)) return v as RawMsg[];
    if (v && typeof v === "object") {
      const nested = pickMessages(v);
      if (nested.length) return nested;
    }
  }
  return [];
}

export async function fetchEmail(): Promise<EmailPayload> {
  if (!isComposioConfigured()) {
    return {
      messages: [],
      sample: false,
      configured: false,
      message:
        "Gmail needs a Composio Platform API key (ak_…). Connect keys (ck_…) do not work here. School Outlook is blocked by DU admin consent.",
    };
  }

  const result = await composioExecute<unknown>("GMAIL_FETCH_EMAILS", {
    max_results: 12,
    label_ids: ["INBOX"],
  });

  if (!result.successful) {
    // Try alternate slug used by some Composio catalogs
    const alt = await composioExecute<unknown>("GMAIL_LIST_THREADS", {
      max_results: 12,
    });
    if (!alt.successful) {
      return {
        messages: [],
        sample: false,
      };
    }
    const threads = pickMessages(alt.data);
    return {
      sample: false,
      messages: threads.slice(0, 12).map((t, i) => {
        const id = String(t.id ?? t.threadId ?? `t${i}`);
        const threadId = String(t.threadId ?? t.id ?? id);
        return {
          id,
          from: String(t.from ?? t.sender ?? "Unknown"),
          subject: String(t.subject ?? t.snippet ?? "(no subject)"),
          preview: String(t.snippet ?? t.preview ?? ""),
          bodyText: String(t.snippet ?? t.body ?? ""),
          receivedAt: String(t.internalDate ?? t.date ?? new Date().toISOString()),
          unread: Boolean(t.unread ?? true),
          priority: "normal" as const,
          htmlUrl: gmailThreadUrl(threadId),
        };
      }),
    };
  }

  const msgs = pickMessages(result.data);
  return {
    sample: false,
    messages: msgs.slice(0, 12).map((m, i) => {
      const id = String(m.id ?? `m${i}`);
      const threadId = String(m.threadId ?? m.thread_id ?? id);
      return {
        id,
        from: String(m.from ?? m.sender ?? "Unknown"),
        subject: String(m.subject ?? "(no subject)"),
        preview: String(m.snippet ?? m.preview ?? ""),
        bodyHtml: typeof m.bodyHtml === "string" ? m.bodyHtml : null,
        bodyText: String(m.bodyText ?? m.body ?? m.snippet ?? ""),
        receivedAt: String(
          m.internalDate
            ? new Date(Number(m.internalDate)).toISOString()
            : m.date ?? new Date().toISOString(),
        ),
        unread: Boolean(m.unread ?? (Array.isArray(m.labelIds) && m.labelIds.includes("UNREAD"))),
        priority: "normal" as const,
        htmlUrl: gmailThreadUrl(threadId),
      };
    }),
  };
}
