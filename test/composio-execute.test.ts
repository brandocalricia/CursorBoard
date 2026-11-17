import assert from "node:assert/strict";
import test from "node:test";
import { composioExecute } from "../src/lib/composio.ts";

const PREV_KEY = process.env.COMPOSIO_API_KEY;
const PREV_FETCH = globalThis.fetch;

function restore() {
  if (PREV_KEY === undefined) delete process.env.COMPOSIO_API_KEY;
  else process.env.COMPOSIO_API_KEY = PREV_KEY;
  globalThis.fetch = PREV_FETCH;
}

test("composio network errors are results so feed fallbacks still run", async () => {
  process.env.COMPOSIO_API_KEY = "ak_test";
  globalThis.fetch = async () => {
    throw new Error("ECONNREFUSED");
  };
  try {
    const result = await composioExecute("GMAIL_FETCH_EMAILS", { max_results: 1 });
    assert.equal(result.successful, false);
    assert.match(result.error ?? "", /ECONNREFUSED/);
  } finally {
    restore();
  }
});

test("composio HTTP failures stay unsuccessful without throwing", async () => {
  process.env.COMPOSIO_API_KEY = "ak_test";
  globalThis.fetch = async () => new Response("upstream down", { status: 503 });
  try {
    const result = await composioExecute("CANVAS_LIST_TODO_ITEMS", {});
    assert.equal(result.successful, false);
    assert.match(result.error ?? "", /composio_http_503/);
  } finally {
    restore();
  }
});

test("composio invalid JSON is unsuccessful without throwing", async () => {
  process.env.COMPOSIO_API_KEY = "ak_test";
  globalThis.fetch = async () =>
    new Response("not-json", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  try {
    const result = await composioExecute("GOOGLECALENDAR_EVENTS_LIST", {});
    assert.equal(result.successful, false);
    assert.match(result.error ?? "", /composio_invalid_json/);
  } finally {
    restore();
  }
});

test("composio successful execute still returns the tool payload", async () => {
  process.env.COMPOSIO_API_KEY = "ak_test";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ successful: true, data: { messages: [] } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  try {
    const result = await composioExecute<{ messages: unknown[] }>("GMAIL_FETCH_EMAILS", {});
    assert.equal(result.successful, true);
    assert.deepEqual(result.data, { messages: [] });
  } finally {
    restore();
  }
});
