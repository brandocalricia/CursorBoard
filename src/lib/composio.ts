/**
 * Minimal Composio Tools API client (v3.1).
 * Uses the user's Composio-connected Canvas account (OAuth-backed) so we
 * are not limited to DU's 30-day manual access tokens.
 */

const COMPOSIO_BASE =
  process.env.COMPOSIO_API_BASE?.trim() || "https://backend.composio.dev";

export type ComposioExecuteResult<T = unknown> = {
  successful: boolean;
  data?: T;
  error?: string;
};

export async function composioExecute<T = unknown>(
  toolSlug: string,
  args: Record<string, unknown> = {},
  connectedAccountId?: string,
): Promise<ComposioExecuteResult<T>> {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) {
    return { successful: false, error: "COMPOSIO_API_KEY unset" };
  }

  const account =
    connectedAccountId?.trim() ||
    process.env.COMPOSIO_CANVAS_ACCOUNT_ID?.trim() ||
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
  return Boolean(process.env.COMPOSIO_API_KEY?.trim());
}
