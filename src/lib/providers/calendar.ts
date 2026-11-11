import type { CalendarPayload } from "../types";
import { composioExecute, isComposioConfigured } from "../composio";

type Raw = Record<string, unknown>;

function pickEvents(data: unknown): Raw[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  for (const key of ["items", "events", "data", "response_data"]) {
    const v = obj[key];
    if (Array.isArray(v)) return v as Raw[];
    if (v && typeof v === "object") {
      const nested = pickEvents(v);
      if (nested.length) return nested;
    }
  }
  return [];
}

function eventDeepLink(raw: Raw): string | undefined {
  const html = raw.htmlLink ?? raw.html_link;
  if (typeof html === "string" && html.includes("google.com")) return html;
  const id = raw.id;
  if (typeof id === "string" && id.length > 4) {
    // Google Calendar deep link by eid is opaque; open event edit when possible
    return `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(id)}`;
  }
  return undefined;
}

export async function fetchCalendar(): Promise<CalendarPayload> {
  if (!isComposioConfigured()) {
    return {
      events: [],
      sample: false,
      configured: false,
      message:
        "Google Calendar needs a Composio Platform API key (ak_…). Your Connect key (ck_…) cannot drive this widget yet.",
    };
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 14 * 86400_000).toISOString();

  const result = await composioExecute<unknown>("GOOGLECALENDAR_EVENTS_LIST", {
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 16,
  });

  if (!result.successful) {
    const alt = await composioExecute<unknown>("GOOGLECALENDAR_FIND_EVENT", {
      time_min: timeMin,
      time_max: timeMax,
    });
    if (!alt.successful) {
      return {
        events: [],
        sample: false,
        configured: true,
        message: result.error ?? "Calendar fetch failed",
      };
    }
    const events = pickEvents(alt.data);
    return mapEvents(events);
  }

  return mapEvents(pickEvents(result.data));
}

function mapEvents(events: Raw[]): CalendarPayload {
  return {
    sample: false,
    configured: true,
    events: events.slice(0, 16).map((e, i) => {
      const startObj = (e.start ?? {}) as Raw;
      const endObj = (e.end ?? {}) as Raw;
      const start = String(
        startObj.dateTime ?? startObj.date ?? e.start_time ?? new Date().toISOString(),
      );
      const end = String(endObj.dateTime ?? endObj.date ?? e.end_time ?? "") || null;
      return {
        id: String(e.id ?? `ev${i}`),
        title: String(e.summary ?? e.title ?? "(no title)"),
        start,
        end,
        location: (e.location as string) ?? null,
        description: (e.description as string) ?? null,
        htmlLink: eventDeepLink(e),
      };
    }),
  };
}
