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
    connectedAccountId?.trim() ||
    process.env.COMPOSIO_CANVAS_ACCOUNT_ID?.trim() ||
    process.env.COMPOSIO_GMAIL_ACCOUNT_ID?.trim() ||
    process.env.COMPOSIO_CALENDAR_ACCOUNT_ID?.trim() ||
    undefined;

  const res = await fetch(
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

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      successful: false,
      error: `composio_http_${res.status}: ${text.slice(0, 200)}`,
    };
  }

  const json = (await res.json()) as ComposioExecuteResult<T>;
  return json;
}

export function isComposioConfigured(): boolean {
  return Boolean(getComposioApiKey());
}
