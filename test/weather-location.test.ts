import assert from "node:assert/strict";
import test from "node:test";
import { shouldCommitDetectedLocation } from "../src/lib/weather.ts";

test("a late geolocation result does not replace saved cities", () => {
  assert.equal(
    shouldCommitDetectedLocation({
      requestCancelled: false,
      savedLocationCount: 2,
    }),
    false,
  );
  assert.equal(
    shouldCommitDetectedLocation({
      requestCancelled: true,
      savedLocationCount: 0,
    }),
    false,
  );
});

test("geolocation is stored only when the user has no saved cities", () => {
  assert.equal(
    shouldCommitDetectedLocation({
      requestCancelled: false,
      savedLocationCount: 0,
    }),
    true,
  );
});
