import assert from "node:assert/strict";
import test from "node:test";
import { selectEmailResult } from "../src/lib/providers/email-select.ts";
import type { EmailPayload } from "../src/lib/types.ts";

function inbox(subject: string): EmailPayload {
  return {
    sample: false,
    configured: true,
    messages: [
      {
        id: "1",
        from: "Ada <ada@example.com>",
        subject,
        preview: subject,
        receivedAt: "2026-11-22T11:00:00Z",
        unread: true,
        priority: "normal",
      },
    ],
  };
}

const imapFailure: EmailPayload = {
  messages: [],
  sample: false,
  configured: true,
  message: "Gmail IMAP failed: connect ECONNRESET",
};

test("an IMAP failure keeps the cached inbox", () => {
  const cached = inbox("Lab feedback");
  const selected = selectEmailResult(imapFailure, cached);
  assert.equal(selected?.messages[0]?.subject, "Lab feedback");
  assert.equal(selected?.sample, false);
  assert.equal(selected?.configured, true);
});

test("an IMAP failure with no cache still reports the error", () => {
  const selected = selectEmailResult(imapFailure, null);
  assert.equal(selected?.messages.length, 0);
  assert.match(selected?.message ?? "", /^Gmail IMAP failed:/);
});

test("an empty cache does not hide an IMAP error", () => {
  const selected = selectEmailResult(imapFailure, {
    messages: [],
    sample: false,
    configured: true,
  });
  assert.match(selected?.message ?? "", /^Gmail IMAP failed:/);
});

test("a confirmed empty inbox does not revive a stale cache", () => {
  const live: EmailPayload = {
    messages: [],
    sample: false,
    configured: true,
    message: "Gmail via IMAP app password",
  };
  const selected = selectEmailResult(live, inbox("Old thread"));
  assert.equal(selected?.messages.length, 0);
  assert.equal(selected?.message, "Gmail via IMAP app password");
});

test("live messages win over cache", () => {
  const selected = selectEmailResult(inbox("New mail"), inbox("Old thread"));
  assert.equal(selected?.messages[0]?.subject, "New mail");
});

test("cache is used when no live source is configured", () => {
  const selected = selectEmailResult(null, inbox("Cached only"));
  assert.equal(selected?.messages[0]?.subject, "Cached only");
});
