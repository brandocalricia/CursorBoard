/**
 * Guards for localhost endpoints that trigger side effects.
 * Browsers set Sec-Fetch-Site and page scripts cannot override it.
 */

export type GuardDenial = { ok: false; status: number; error: string };
export type GuardAllow = { ok: true; id: string };
export type GuardResult = GuardAllow | GuardDenial;

function header(request: Request, name: string): string {
  return (request.headers.get(name) ?? "").trim();
}

export function loopbackHost(request: Request): boolean {
  const host = header(request, "host").toLowerCase();
  const hostname = host.startsWith("[")
    ? host.slice(1, host.indexOf("]"))
    : (host.split(":")[0] ?? "");
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

function bearer(request: Request): string {
  const auth = header(request, "authorization");
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

/**
 * Decide whether POST /api/automations may spawn a local script.
 *
 * Cross-site browser calls are rejected (Sec-Fetch-Site cannot be forged by
 * page scripts). The Host must be loopback unless the caller presents
 * INGEST_SECRET — a DNS-rebinding page is same-origin to its own name but
 * the Host header is not 127.0.0.1. A missing or invalid JSON body must not
 * default to running every script.
 */
export function guardAutomationPost(
  request: Request,
  body: unknown,
  knownIds: readonly string[],
  expectedSecret: string | undefined,
  invalidJson = false,
): GuardResult {
  const site = header(request, "sec-fetch-site").toLowerCase();
  if (site === "cross-site" || site === "same-site") {
    return { ok: false, status: 403, error: "forbidden" };
  }

  const contentType = header(request, "content-type").toLowerCase();
  if (!contentType.includes("application/json")) {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }

  if (invalidJson) {
    return { ok: false, status: 400, error: "invalid_json" };
  }

  const id =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { id?: unknown }).id
      : undefined;
  if (typeof id !== "string" || !knownIds.includes(id)) {
    return { ok: false, status: 400, error: "unknown_automation" };
  }

  if (!loopbackHost(request)) {
    const secret = expectedSecret?.trim() ?? "";
    const token = bearer(request);
    if (!secret || token !== secret) {
      return { ok: false, status: 401, error: "unauthorized" };
    }
  }

  return { ok: true, id };
}
