import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { guardLocalWrite, loopbackHostname } from "./local-write-guard.ts";

function decide(
  headers: Record<string, string>,
  secret?: string,
  url = "http://127.0.0.1:3000/api/ingest",
) {
  return guardLocalWrite(new Request(url, { method: "POST", headers }), secret);
}

describe("guardLocalWrite", () => {
  it("rejects a cross-site text/plain POST that would otherwise store a feed", () => {
    const result = decide({
      "content-type": "text/plain",
      "sec-fetch-site": "cross-site",
      host: "127.0.0.1:3000",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 403);
  });

  it("rejects cross-site JSON even when the caller knows INGEST_SECRET", () => {
    const result = decide(
      {
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
        host: "127.0.0.1:3000",
        authorization: "Bearer local-secret",
      },
      "local-secret",
    );
    assert.deepEqual(result, { ok: false, status: 403, error: "forbidden" });
  });

  it("rejects same-site requests from another local port", () => {
    const result = decide({
      "content-type": "application/json",
      "sec-fetch-site": "same-site",
      host: "127.0.0.1:3000",
    });
    assert.deepEqual(result, { ok: false, status: 403, error: "forbidden" });
  });

  it("rejects a non-JSON body from a browser that omitted Sec-Fetch-Site", () => {
    const result = decide({
      "content-type": "text/plain",
      host: "127.0.0.1:3000",
    });
    assert.deepEqual(result, {
      ok: false,
      status: 415,
      error: "unsupported_media_type",
    });
  });

  it("allows the dashboard and local agents on an exact loopback host", () => {
    assert.deepEqual(
      decide({
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
        host: "127.0.0.1:3000",
      }),
      { ok: true },
    );
    assert.deepEqual(
      decide({
        "content-type": "application/json",
        host: "localhost:3000",
      }),
      { ok: true },
    );
  });

  it("does not treat a lookalike host or X-Forwarded-For as loopback", () => {
    assert.equal(loopbackHostname("localhost.evil.com"), false);
    assert.equal(loopbackHostname("127.0.0.1.evil.com:3000"), false);
    assert.equal(loopbackHostname("[::1]:3000"), true);

    const lookalike = decide({
      "content-type": "application/json",
      host: "localhost.evil.com:3000",
      "x-forwarded-for": "127.0.0.1",
    });
    assert.deepEqual(lookalike, { ok: false, status: 401, error: "unauthorized" });

    const forwarded = decide({
      "content-type": "application/json",
      host: "dashboard.example:3000",
      "x-forwarded-for": "127.0.0.1",
    });
    assert.deepEqual(forwarded, { ok: false, status: 401, error: "unauthorized" });
  });

  it("still requires INGEST_SECRET on loopback when it is configured", () => {
    const missing = decide(
      {
        "content-type": "application/json",
        host: "127.0.0.1:3000",
      },
      "local-secret",
    );
    assert.deepEqual(missing, { ok: false, status: 401, error: "unauthorized" });
  });

  it("allows a non-loopback agent that presents INGEST_SECRET", () => {
    const result = decide(
      {
        "content-type": "application/json",
        host: "dashboard.internal:3000",
        authorization: "Bearer local-secret",
      },
      "local-secret",
    );
    assert.deepEqual(result, { ok: true });
  });
});
