import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  classifyCanvasCoursesFailure,
  isCanvasRateLimit,
} from "../src/lib/providers/canvas-status.ts";

test("401 and a non-quota 403 are an expired Canvas token", () => {
  assert.equal(classifyCanvasCoursesFailure(401).status, "token_expired");
  assert.equal(
    classifyCanvasCoursesFailure(403, "Invalid access token").status,
    "token_expired",
  );
});

test("Canvas rate-limit 403 and 429 stay transient", () => {
  const limited = classifyCanvasCoursesFailure(
    403,
    '{"errors":[{"message":"403 Forbidden (Rate Limit Exceeded)"}]}',
  );
  assert.equal(limited.status, "network_error");
  assert.match(limited.message, /rate limit/i);

  assert.equal(classifyCanvasCoursesFailure(429, "Too Many Requests").status, "network_error");
  assert.equal(
    classifyCanvasCoursesFailure(403, "", "0").status,
    "network_error",
  );
  assert.equal(isCanvasRateLimit(403, "nope", "12"), false);
});

test("upstream Canvas 5xx does not look like a revoked token", () => {
  assert.equal(classifyCanvasCoursesFailure(500, "upstream").status, "network_error");
  assert.equal(classifyCanvasCoursesFailure(503, "").status, "network_error");
});

test("health probe does not fetch Canvas", () => {
  const src = readFileSync(
    new URL("../src/app/api/health/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(src, /fetchCanvas/);
});
