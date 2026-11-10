import type { UserSettings } from "./types";
import { sqlGet, sqlRun } from "./db";
import { WIDGET_IDS } from "./widgets/registry-meta";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  accent: "#14B8A6",
  density: "comfortable",
  layoutPreset: "balanced",
  enabledWidgets: [...WIDGET_IDS],
};

export function getSettings(): UserSettings {
  const row = sqlGet<{ settings: string }>(
    "SELECT settings FROM user_settings WHERE id = 1",
  );
  if (!row) return { ...DEFAULT_SETTINGS, enabledWidgets: [...DEFAULT_SETTINGS.enabledWidgets] };
  try {
    const parsed = JSON.parse(row.settings) as Partial<UserSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      enabledWidgets: parsed.enabledWidgets?.length
        ? parsed.enabledWidgets
        : [...DEFAULT_SETTINGS.enabledWidgets],
    };
  } catch {
    return { ...DEFAULT_SETTINGS, enabledWidgets: [...DEFAULT_SETTINGS.enabledWidgets] };
  }
}

export function saveSettings(next: UserSettings): UserSettings {
  const payload = JSON.stringify(next);
  sqlRun(
    `INSERT INTO user_settings (id, settings, updated_at)
     VALUES (1, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET settings = excluded.settings, updated_at = datetime('now')`,
    [payload],
  );
  return next;
}
