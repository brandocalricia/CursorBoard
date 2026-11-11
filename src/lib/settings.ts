import type { UserSettings } from "./types";
import { sqlGet, sqlRun } from "./db";
import {
  WIDGET_IDS,
  SETTINGS_VERSION,
  migrateEnabledWidgets,
  normalizeEnabledWidgets,
} from "./widgets/registry-meta";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  accent: "#5CEE15",
  density: "comfortable",
  layoutPreset: "balanced",
  enabledWidgets: [...WIDGET_IDS],
  settingsVersion: SETTINGS_VERSION,
};

export function getSettings(): UserSettings {
  const row = sqlGet<{ settings: string }>(
    "SELECT settings FROM user_settings WHERE id = 1",
  );
  if (!row) {
    return { ...DEFAULT_SETTINGS, enabledWidgets: [...DEFAULT_SETTINGS.enabledWidgets] };
  }
  try {
    const parsed = JSON.parse(row.settings) as Partial<UserSettings>;
    const fromVersion = parsed.settingsVersion ?? 1;
    const next: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      enabledWidgets: migrateEnabledWidgets(parsed.enabledWidgets, fromVersion),
      settingsVersion: SETTINGS_VERSION,
    };
    // v4: CryptoZen lime replaces legacy teal glass accent
    if (fromVersion < 4) {
      const legacy = (parsed.accent ?? "").toLowerCase();
      if (!legacy || legacy === "#14b8a6" || legacy === "#14b8a6ff") {
        next.accent = "#5CEE15";
      }
    }
    if (fromVersion < SETTINGS_VERSION) {
      saveSettings(next);
    }
    return next;
  } catch {
    return { ...DEFAULT_SETTINGS, enabledWidgets: [...DEFAULT_SETTINGS.enabledWidgets] };
  }
}

export function saveSettings(next: UserSettings): UserSettings {
  const normalized: UserSettings = {
    ...next,
    enabledWidgets: normalizeEnabledWidgets(next.enabledWidgets),
    settingsVersion: SETTINGS_VERSION,
  };
  const payload = JSON.stringify(normalized);
  sqlRun(
    `INSERT INTO user_settings (id, settings, updated_at)
     VALUES (1, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET settings = excluded.settings, updated_at = datetime('now')`,
    [payload],
  );
  return normalized;
}
