/**
 * Guards for localhost endpoints that write SQLite state.
 * Page scripts cannot change Sec-Fetch-Site, and a non-JSON content type is
 * how a visited site would POST here without a CORS preflight.
 */

export type WriteGuardDenial = { ok: false; status: number; error: string };
export type WriteGuardResult = { ok: true } | WriteGuardDenial;

function header(request: Request, name: string): string {
  return (request.headers.get(name) ?? "").trim();
}

/** Exact loopback host. `localhost.evil.com` and `127.0.0.1.evil.com` are not loopback. */
export function loopbackHostname(hostHeader: string): boolean {
  const host = hostHeader.trim().toLowerCase();
  if (!host) return false;
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
 * Allow a JSON write from this dashboard or a local agent.
 * Cross-site browser calls are rejected even when they present a bearer token.
 * When `secret` is set (INGEST_SECRET), every caller must present it. Otherwise
 * only an exact loopback Host is accepted. Client-supplied X-Forwarded-For is
 * ignored — it is not proof of loopback.
 */
export function guardLocalWrite(
  request: Request,
  secret?: string,
): WriteGuardResult {
  const site = header(request, "sec-fetch-site").toLowerCase();
  if (site === "cross-site" || site === "same-site") {
    return { ok: false, status: 403, error: "forbidden" };
  }

  const contentType = header(request, "content-type").toLowerCase();
  if (!contentType.includes("application/json")) {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }

  const expected = secret?.trim() ?? "";
  if (expected) {
    if (bearer(request) !== expected) {
      return { ok: false, status: 401, error: "unauthorized" };
    }
    return { ok: true };
  }

  if (!loopbackHostname(header(request, "host"))) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  return { ok: true };
}
