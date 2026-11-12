import type { EmailItem, EmailPayload } from "../types";
import { composioExecute, isComposioConfigured } from "../composio";
import { readFeedCache, writeFeedCache } from "../feed-cache";

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

function mapComposioMessages(msgs: RawMsg[]): EmailItem[] {
  return msgs.slice(0, 12).map((m, i) => {
    const id = String(m.messageId ?? m.id ?? `m${i}`);
    const threadId = String(m.threadId ?? m.thread_id ?? id);
    const previewObj =
      m.preview && typeof m.preview === "object"
        ? (m.preview as Record<string, unknown>)
        : null;
    const subject = String(
      m.subject ?? previewObj?.subject ?? "(no subject)",
    );
    const preview = String(
      previewObj?.body ?? m.snippet ?? m.preview ?? m.messageText ?? "",
    );
    const labels = Array.isArray(m.labelIds) ? (m.labelIds as string[]) : [];
    const htmlUrl =
      typeof m.display_url === "string" && m.display_url.startsWith("http")
        ? m.display_url
        : gmailThreadUrl(threadId);
    return {
      id,
      from: String(m.sender ?? m.from ?? "Unknown"),
      subject,
      preview,
      bodyHtml: typeof m.bodyHtml === "string" ? m.bodyHtml : null,
      bodyText: String(m.messageText ?? m.bodyText ?? m.body ?? preview),
      receivedAt: String(
        m.messageTimestamp ??
          (m.internalDate
            ? new Date(Number(m.internalDate)).toISOString()
            : m.date ?? new Date().toISOString()),
      ),
      unread: Boolean(m.unread ?? labels.includes("UNREAD")),
      priority: labels.includes("IMPORTANT") ? ("high" as const) : ("normal" as const),
      htmlUrl,
    };
  });
}

function isImapConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim(),
  );
}

async function fetchViaImap(): Promise<EmailPayload | null> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim()?.replace(/\s+/g, "");
  if (!user || !pass) return null;

  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false,
    });
    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const total = client.mailbox && typeof client.mailbox === "object"
          ? Number((client.mailbox as { exists?: number }).exists ?? 0)
          : 0;
        const start = Math.max(1, total - 11);
        const messages: EmailItem[] = [];
        for await (const msg of client.fetch(`${start}:*`, {
          envelope: true,
          source: false,
          flags: true,
          uid: true,
        })) {
          const env = msg.envelope;
          const from = env?.from?.[0];
          const fromStr = from
            ? `${from.name ? `${from.name} ` : ""}<${from.address ?? ""}>`.trim()
            : "Unknown";
          const subject = env?.subject ?? "(no subject)";
          const mid = env?.messageId?.replace(/[<>]/g, "") ?? String(msg.uid);
          messages.push({
            id: String(msg.uid),
            from: fromStr,
            subject,
            preview: subject,
            bodyText: subject,
            receivedAt: new Date(env?.date ?? Date.now()).toISOString(),
            unread: !(msg.flags?.has("\\Seen") ?? false),
            priority: "normal",
            htmlUrl: `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(mid)}`,
          });
        }
        messages.reverse();
        const payload: EmailPayload = {
          messages: messages.slice(0, 12),
          sample: false,
          configured: true,
          message: "Gmail via IMAP app password",
        };
        writeFeedCache("email", payload);
        return payload;
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => undefined);
    }
  } catch (err) {
    return {
      messages: [],
      sample: false,
      configured: true,
      message: `Gmail IMAP failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function fetchViaComposio(): Promise<EmailPayload | null> {
  if (!isComposioConfigured()) return null;

  const result = await composioExecute<unknown>("GMAIL_FETCH_EMAILS", {
    max_results: 12,
    label_ids: ["INBOX"],
    verbose: false,
    include_payload: false,
  });

  if (result.successful) {
    const msgs = pickMessages(result.data);
    const payload: EmailPayload = {
      sample: false,
      configured: true,
      messages: mapComposioMessages(msgs),
    };
    writeFeedCache("email", payload);
    return payload;
  }

  const alt = await composioExecute<unknown>("GMAIL_LIST_THREADS", {
    max_results: 12,
  });
  if (!alt.successful) return null;

  const threads = pickMessages(alt.data);
  const payload: EmailPayload = {
    sample: false,
    configured: true,
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
  writeFeedCache("email", payload);
  return payload;
}

export async function fetchEmail(): Promise<EmailPayload> {
  const live = (await fetchViaComposio()) ?? (await fetchViaImap());
  if (live && live.messages.length) return live;
  if (live && live.configured && live.message?.startsWith("Gmail IMAP failed")) {
    return live;
  }

  const cached = readFeedCache<EmailPayload>("email", 6 * 60 * 60_000);
  if (cached?.messages?.length) {
    return {
      ...cached,
      sample: false,
      configured: true,
      message: cached.message ?? "Gmail from local feed cache",
    };
  }

  if (live) return live;

  const hasImapHint = isImapConfigured();
  return {
    messages: [],
    sample: false,
    configured: false,
    message: hasImapHint
      ? "Gmail credentials are set but inbox is empty or unreachable."
      : "Gmail not connected. Add COMPOSIO_API_KEY (ak_…) + COMPOSIO_GMAIL_ACCOUNT_ID, or set GMAIL_USER + GMAIL_APP_PASSWORD (Google App Password). School Outlook stays blocked by DU admin consent.",
  };
}
