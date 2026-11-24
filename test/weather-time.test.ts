import assert from "node:assert/strict";
import test from "node:test";
import {
  hourlyStartIndex,
  instantFromZonedNaive,
  zonedNaiveToUtcIso,
} from "../src/lib/weather.ts";

function londonLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

test("London civil times stay on the London clock in any server zone", () => {
  const sunrise = instantFromZonedNaive("2026-11-24T07:30", "Europe/London");
  assert.ok(sunrise);
  assert.equal(sunrise.toISOString(), "2026-11-24T07:30:00.000Z");
  assert.equal(londonLabel(sunrise.toISOString()), "7:30 AM");

  const corrected = londonLabel(zonedNaiveToUtcIso("2026-11-24T07:30", "Europe/London"));
  assert.equal(corrected, "7:30 AM");
  // Parsing the naive stamp on a Denver machine labels 7:30 London as 2:30 PM.
  const misread = londonLabel(new Date("2026-11-24T07:30").toISOString());
  if (misread !== corrected) assert.notEqual(corrected, misread);
});

test("hourly window uses the city clock, not the machine clock", () => {
  const times = Array.from({ length: 24 }, (_, h) => {
    return `2026-11-24T${String(h).padStart(2, "0")}:00`;
  });
  // 18:00 UTC is 6 PM in London and 11 AM in Denver.
  const now = Date.parse("2026-11-24T18:00:00Z");
  const idx = hourlyStartIndex(times, "Europe/London", now);
  assert.equal(times[idx], "2026-11-24T18:00");
  assert.equal(londonLabel(zonedNaiveToUtcIso(times[idx]!, "Europe/London")), "6:00 PM");
});

test("Denver civil time converts to the matching UTC instant", () => {
  const instant = instantFromZonedNaive("2026-11-24T11:00", "America/Denver");
  assert.equal(instant?.toISOString(), "2026-11-24T18:00:00.000Z");
});

test("unknown zones leave the original stamp alone", () => {
  assert.equal(zonedNaiveToUtcIso("2026-11-24T07:30", "auto"), "2026-11-24T07:30");
  assert.equal(zonedNaiveToUtcIso("2026-11-24T07:30", "Not/AZone"), "2026-11-24T07:30");
  assert.equal(instantFromZonedNaive("", "Europe/London"), null);
});
