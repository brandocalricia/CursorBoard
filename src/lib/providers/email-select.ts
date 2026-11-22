import type { EmailPayload } from "../types";

const IMAP_FAILURE_PREFIX = "Gmail IMAP failed";

/**
 * Keep a cached inbox when IMAP errors. A successful live result wins,
 * including a confirmed empty inbox, so stale cache is not revived.
 */
export function selectEmailResult(
  live: EmailPayload | null,
  cached: EmailPayload | null,
): EmailPayload | null {
  if (live && (live.messages?.length ?? 0) > 0) return live;
  const imapFailed = Boolean(
    live?.configured && live.message?.startsWith(IMAP_FAILURE_PREFIX),
  );
  if (live && !imapFailed) return live;
  if (cached?.messages?.length) {
    return {
      ...cached,
      sample: false,
      configured: true,
      message: cached.message ?? "Gmail from local feed cache",
    };
  }
  return live;
}

export function imapFailureMessage(err: unknown): string {
  const detail = err instanceof Error ? err.message : String(err);
  return `${IMAP_FAILURE_PREFIX}: ${detail}`;
}
