import { NextResponse } from "next/server";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import type { UserSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSettings(), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<UserSettings>;
  const current = getSettings();
  const next: UserSettings = {
    ...DEFAULT_SETTINGS,
    ...current,
    ...body,
    enabledWidgets: body.enabledWidgets ?? current.enabledWidgets,
  };
  return NextResponse.json(saveSettings(next), {
    headers: { "cache-control": "private, no-store" },
  });
}
