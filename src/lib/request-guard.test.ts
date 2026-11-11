import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { guardAutomationPost } from "./request-guard.ts";

const IDS = ["github-digest", "all"] as const;

function post(
  headers: Record<string, string>,
  body: unknown = { id: "all" },
  secret = "",
) {
  return guardAutomationPost(
    new Request("http://127.0.0.1:3000/api/automations", { headers }),
    body,
    IDS,
    secret,
  );
}

describe("guardAutomationPost", () => {
  it("rejects a cross-site browser POST that would otherwise run every script", () => {
    const result = post({
      "content-type": "application/json",
      "sec-fetch-site": "cross-site",
      host: "127.0.0.1:3000",
    });
    assert.deepEqual(result, { ok: false, status: 403, error: "forbidden" });
  });

  it("rejects same-site requests from another local port", () => {
    const result = post({
      "content-type": "application/json",
      "sec-fetch-site": "same-site",
      host: "127.0.0.1:3000",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 403);
  });

  it("allows the dashboard Run once button (same-origin JSON)", () => {
    const result = post({
      "content-type": "application/json; charset=utf-8",
      "sec-fetch-site": "same-origin",
      host: "127.0.0.1:3000",
    });
    assert.deepEqual(result, { ok: true, id: "all" });
  });

  it("does not treat a non-JSON body as a request to run all scripts", () => {
    const result = post(
      {
        "content-type": "text/plain",
        host: "127.0.0.1:3000",
      },
      "x",
    );
    assert.deepEqual(result, { ok: false, status: 415, error: "unsupported_media_type" });
  });

  it("does not run scripts when the JSON body is malformed", () => {
    const result = guardAutomationPost(
      new Request("http://127.0.0.1:3000/api/automations", {
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
          host: "127.0.0.1:3000",
        },
      }),
      undefined,
      IDS,
      "",
      true,
    );
    assert.deepEqual(result, { ok: false, status: 400, error: "invalid_json" });
  });

  it("rejects JSON that omits a known automation id", () => {
    const result = post(
      {
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
        host: "127.0.0.1:3000",
      },
      {},
    );
    assert.deepEqual(result, { ok: false, status: 400, error: "unknown_automation" });
  });

  it("allows a non-browser loopback caller", () => {
    const result = post({
      "content-type": "application/json",
      host: "localhost:3000",
    });
    assert.deepEqual(result, { ok: true, id: "all" });
  });

  it("rejects a non-browser caller that only spoofs X-Forwarded-For", () => {
    const result = post({
      "content-type": "application/json",
      host: "192.168.1.20:3000",
      "x-forwarded-for": "127.0.0.1",
    });
    assert.deepEqual(result, { ok: false, status: 401, error: "unauthorized" });
  });

  it("rejects a same-origin request whose Host is not loopback (DNS rebinding)", () => {
    const result = post({
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      host: "attacker.example",
    });
    assert.deepEqual(result, { ok: false, status: 401, error: "unauthorized" });
  });

  it("allows a non-loopback caller that presents INGEST_SECRET", () => {
    const result = post(
      {
        "content-type": "application/json",
        host: "192.168.1.20:3000",
        authorization: "Bearer s3cret",
      },
      { id: "github-digest" },
      "s3cret",
    );
    assert.deepEqual(result, { ok: true, id: "github-digest" });
  });
});
