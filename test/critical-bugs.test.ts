import assert from "node:assert/strict";
import test from "node:test";
import { connectedAccountForTool } from "../src/lib/composio.ts";
import { readTodoList } from "../src/lib/providers/canvas-todos.ts";
import { sanitizeHtml } from "../src/lib/sanitize.ts";

test("sanitizeHtml drops slash-attribute handlers that used to execute", () => {
  const payloads = [
    "<svg/onload=alert(1)>",
    "<img/src=x/onerror=alert(1)>",
    '<a/href="https://example.com"/onclick=alert(1)>click</a>',
    "<p/onclick=alert(1)>hi</p>",
    '<a href="javascript:alert(1)">x</a>',
    "<script>alert(1)</script>",
    '<img src=x onerror=alert(1)>',
    "<svg onload=alert(1)>",
    '<div onclick="alert(1)">x</div>',
  ];
  for (const payload of payloads) {
    const out = sanitizeHtml(payload);
    assert.doesNotMatch(out, /<\s*svg/i, payload);
    assert.doesNotMatch(out, /<\s*script/i, payload);
    assert.doesNotMatch(out, /<\s*img/i, payload);
    assert.doesNotMatch(out, /\son\w+\s*=/i, payload);
    assert.doesNotMatch(out, /javascript:/i, payload);
  }
});

test("sanitizeHtml keeps safe assignment markup and https links", () => {
  const out = sanitizeHtml(
    '<p>Hi <strong>there</strong></p><a href="https://canvas.du.edu/courses/1/assignments/2">Open</a>',
  );
  assert.equal(
    out,
    '<p>Hi <strong>there</strong></p><a href="https://canvas.du.edu/courses/1/assignments/2" target="_blank" rel="noreferrer">Open</a>',
  );
});

test("sanitizeHtml escapes comparisons instead of treating them as tags", () => {
  assert.equal(sanitizeHtml("1 < 2 > 3"), "1 &lt; 2 &gt; 3");
});

test("empty Canvas todo list is a live result, not an unrecognized payload", () => {
  const empty = readTodoList({ response_data: [] });
  assert.equal(empty.recognized, true);
  assert.deepEqual(empty.todos, []);

  const nested = readTodoList({ data: { response_data: [] } });
  assert.equal(nested.recognized, true);
  assert.deepEqual(nested.todos, []);
});

test("non-todo Composio payloads stay unrecognized", () => {
  assert.equal(readTodoList({ error: "nope" }).recognized, false);
  assert.equal(readTodoList(null).recognized, false);
  assert.equal(readTodoList({ items: [] }).recognized, false);
});

test("todo rows with an assignment are still recognized", () => {
  const read = readTodoList({
    response_data: [{ assignment: { id: 9, name: "Lab" } }],
  });
  assert.equal(read.recognized, true);
  assert.equal(read.todos.length, 1);
});

test("Composio account ids stay on their own toolkit", () => {
  const env = {
    COMPOSIO_CANVAS_ACCOUNT_ID: "canvas_acct",
    COMPOSIO_GMAIL_ACCOUNT_ID: "gmail_acct",
    COMPOSIO_CALENDAR_ACCOUNT_ID: "cal_acct",
  };
  assert.equal(
    connectedAccountForTool("CANVAS_LIST_TODO_ITEMS", undefined, env),
    "canvas_acct",
  );
  assert.equal(
    connectedAccountForTool("GMAIL_FETCH_EMAILS", undefined, env),
    "gmail_acct",
  );
  assert.equal(
    connectedAccountForTool("GOOGLECALENDAR_EVENTS_LIST", undefined, env),
    "cal_acct",
  );
  assert.equal(
    connectedAccountForTool("GMAIL_FETCH_EMAILS", "  explicit  ", env),
    "explicit",
  );
  assert.equal(
    connectedAccountForTool("GMAIL_FETCH_EMAILS", undefined, {
      COMPOSIO_CANVAS_ACCOUNT_ID: "canvas_acct",
    }),
    undefined,
  );
  assert.equal(
    connectedAccountForTool("CANVAS_GET_SINGLE_ASSIGNMENT", undefined, {
      COMPOSIO_GMAIL_ACCOUNT_ID: "gmail_acct",
    }),
    undefined,
  );
});
