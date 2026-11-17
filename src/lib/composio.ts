/**
 * Minimal Composio Tools API client (v3.1).
 * Platform project keys (`ak_…`) work with `x-api-key` + tools/execute.
 * Connect consumer keys (`ck_…`) do not — treat them as unset.
 */

const COMPOSIO_BASE =
  process.env.COMPOSIO_API_BASE?.trim() || "https://backend.composio.dev";

export type ComposioExecuteResult<T = unknown> = {
  successful: boolean;
  data?: T;
  error?: string;
};

/** Returns a usable Platform API key, or null for ck_/empty/invalid. */
export function getComposioApiKey(): string | null {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) return null;
  // Connect MCP consumer keys cannot call tools/execute
  if (apiKey.startsWith("ck_")) return null;
  return apiKey;
}

function accountForTool(toolSlug: string): string | undefined {
  const slug = toolSlug.toUpperCase();
  if (slug.startsWith("GMAIL_")) {
    return process.env.COMPOSIO_GMAIL_ACCOUNT_ID?.trim() || undefined;
  }
  if (slug.startsWith("GOOGLECALENDAR_") || slug.startsWith("GOOGLE_CALENDAR_")) {
    return process.env.COMPOSIO_CALENDAR_ACCOUNT_ID?.trim() || undefined;
  }
  if (slug.startsWith("CANVAS_")) {
    return process.env.COMPOSIO_CANVAS_ACCOUNT_ID?.trim() || undefined;
  }
  return undefined;
}

export async function composioExecute<T = unknown>(
  toolSlug: string,
  args: Record<string, unknown> = {},
  connectedAccountId?: string,
): Promise<ComposioExecuteResult<T>> {
  const apiKey = getComposioApiKey();
  if (!apiKey) {
    return { successful: false, error: "COMPOSIO_API_KEY unset or unsupported (ck_)" };
  }

  const account =
    connectedAccountId?.trim() || accountForTool(toolSlug) || undefined;

  let res: Response;
  try {
    res = await fetch(
      `${COMPOSIO_BASE}/api/v3.1/tools/execute/${encodeURIComponent(toolSlug)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          arguments: args,
          ...(account ? { connected_account_id: account } : {}),
        }),
        cache: "no-store",
      },
    );
  } catch (err) {
    // Callers fall through to IMAP, a manual Canvas token, or the feed cache.
    // A thrown fetch skips those paths and 500s the widget.
    return {
      successful: false,
      error: `composio_network: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      successful: false,
      error: `composio_http_${res.status}: ${text.slice(0, 200)}`,
    };
  }

  try {
    const json = (await res.json()) as ComposioExecuteResult<T>;
    if (!json || typeof json !== "object") {
      return { successful: false, error: "composio_invalid_json" };
    }
    return json;
  } catch (err) {
    return {
      successful: false,
      error: `composio_invalid_json: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function isComposioConfigured(): boolean {
  return Boolean(getComposioApiKey());
}
