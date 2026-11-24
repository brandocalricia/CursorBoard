/** WMO weather code → short label (Apple Weather–style wording). */
export function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code === 51 || code === 53 || code === 55) return "Drizzle";
  if (code === 56 || code === 57) return "Freezing drizzle";
  if (code === 61 || code === 63 || code === 65) return "Rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code === 71 || code === 73 || code === 75) return "Snow";
  if (code === 77) return "Snow grains";
  if (code === 80 || code === 81 || code === 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm · hail";
  return "Mixed";
}

export function toDisplayTemp(tempC: number, unit: "c" | "f"): number {
  return unit === "f" ? Math.round((tempC * 9) / 5 + 32) : Math.round(tempC);
}

export function windDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[i]!;
}

export function uvLabel(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

/**
 * Open-Meteo sends clock times with no offset, in the location timezone
 * (`timezone=auto` → an IANA name such as Europe/London).
 * `new Date("2026-11-24T07:30")` reads that as the machine's zone, so a
 * Denver browser labels London's 7:30 sunrise as 2:30 PM and the hourly
 * chart pairs the current label with a temperature from hours earlier.
 * Return the real UTC instant for that civil time, or null if it can't be read.
 */
export function instantFromZonedNaive(
  naive: string,
  timeZone: string | null | undefined,
): Date | null {
  if (!timeZone || timeZone === "auto") return null;
  const match = naive
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = desiredUtc;
  try {
    for (let i = 0; i < 2; i++) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).formatToParts(new Date(utc));
      const get = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value);
      const zonedHour = get("hour") === 24 ? 0 : get("hour");
      const asZoned = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        zonedHour,
        get("minute"),
        get("second"),
      );
      utc = desiredUtc - (asZoned - utc);
    }
  } catch {
    return null;
  }
  const result = new Date(utc);
  return Number.isFinite(result.getTime()) ? result : null;
}

/** UTC ISO instant for an Open-Meteo local timestamp. Unchanged if the zone is unknown. */
export function zonedNaiveToUtcIso(
  naive: string,
  timeZone: string | null | undefined,
): string {
  return instantFromZonedNaive(naive, timeZone)?.toISOString() ?? naive;
}

/** First hourly slot at or after now−30min, using the city's clock, not the server's. */
export function hourlyStartIndex(
  times: string[],
  timeZone: string | null | undefined,
  nowMs: number,
): number {
  const idx = times.findIndex((t) => {
    const instant = instantFromZonedNaive(t, timeZone);
    const ms = instant ? instant.getTime() : new Date(t).getTime();
    return Number.isFinite(ms) && ms >= nowMs - 30 * 60_000;
  });
  return idx < 0 ? 0 : idx;
}

export function formatClock(iso: string, timezone?: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone && timezone !== "auto" ? timezone : undefined,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export function formatWeekday(isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
  } catch {
    return isoDate;
  }
}
