import { NextResponse } from "next/server";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { parseSettingsPatch } from "@/lib/settings-schema";
import type { UserSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSettings(), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseSettingsPatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const current = getSettings();
  const next: UserSettings = {
    ...DEFAULT_SETTINGS,
    ...current,
    ...parsed.data,
    enabledWidgets: parsed.data.enabledWidgets ?? current.enabledWidgets,
    widgetOrder: parsed.data.widgetOrder ?? current.widgetOrder,
    widgetSpans: parsed.data.widgetSpans ?? current.widgetSpans,
  };
  return NextResponse.json(saveSettings(next), {
    headers: { "cache-control": "private, no-store" },
  });
}
