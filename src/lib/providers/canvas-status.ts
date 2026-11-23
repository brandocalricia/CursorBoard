export type CanvasCoursesFailure = {
  status: "token_expired" | "unauthorized" | "network_error";
  message: string;
};

const TOKEN_REJECTED =
  "Your Canvas access token was rejected (expired or revoked). DU tokens last ~30 days — renew it below.";

/** Canvas uses 403 for both revoked tokens and the leaky-bucket rate limit. */
export function isCanvasRateLimit(
  status: number,
  body: string,
  rateLimitRemaining?: string | null,
): boolean {
  if (status === 429) return true;
  if (status !== 403) return false;
  if (/rate limit/i.test(body)) return true;
  if (rateLimitRemaining == null || rateLimitRemaining === "") return false;
  const remaining = Number(rateLimitRemaining);
  return Number.isFinite(remaining) && remaining <= 0;
}

/**
 * Classify the courses-list response. Only a rejected token should surface
 * the renewal banner. Rate limits and upstream 5xx are transient: callers
 * keep the last saved assignment list instead of treating them as expiry.
 */
export function classifyCanvasCoursesFailure(
  status: number,
  body = "",
  rateLimitRemaining?: string | null,
): CanvasCoursesFailure {
  if (isCanvasRateLimit(status, body, rateLimitRemaining)) {
    return {
      status: "network_error",
      message: "Canvas rate limit reached. Showing the last saved assignments.",
    };
  }
  if (status === 401 || status === 403) {
    return { status: "token_expired", message: TOKEN_REJECTED };
  }
  if (status === 408 || status >= 500) {
    return {
      status: "network_error",
      message: `Canvas returned HTTP ${status}. Showing the last saved assignments.`,
    };
  }
  return {
    status: "unauthorized",
    message: `Canvas returned HTTP ${status}.`,
  };
}
