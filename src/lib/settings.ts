import type { UserSettings, WidgetSpan } from "./types";
import { sqlGet, sqlRun } from "./db";
import {
  WIDGET_IDS,
  SETTINGS_VERSION,
  migrateEnabledWidgets,
  normalizeEnabledWidgets,
  normalizeWidgetOrder,
} from "./widgets/registry-meta";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  accent: "#5CEE15",
  density: "comfortable",
  layoutPreset: "balanced",
  themePack: "cryptozen",
  enabledWidgets: [...WIDGET_IDS],
  widgetOrder: [...WIDGET_IDS],
  widgetSpans: {},
  weatherCoords: null,
  weatherLocations: [],
  weatherActiveId: null,
  weatherUnit: "f",
  settingsVersion: SETTINGS_VERSION,
};

function normalizeSpans(
  spans: UserSettings["widgetSpans"] | undefined,
): Partial<Record<string, WidgetSpan>> {
  const out: Partial<Record<string, WidgetSpan>> = {};
  if (!spans) return out;
  for (const [k, v] of Object.entries(spans)) {
    if (v === 1 || v === 2 || v === 3) out[k] = v;
  }
  return out;
}

export function getSettings(): UserSettings {
  const row = sqlGet<{ settings: string }>(
    "SELECT settings FROM user_settings WHERE id = 1",
  );
  if (!row) {
    return {
      ...DEFAULT_SETTINGS,
      enabledWidgets: [...DEFAULT_SETTINGS.enabledWidgets],
      widgetOrder: [...(DEFAULT_SETTINGS.widgetOrder ?? WIDGET_IDS)],
      widgetSpans: {},
    };
  }
  try {
    const parsed = JSON.parse(row.settings) as Partial<UserSettings>;
    const fromVersion = parsed.settingsVersion ?? 1;
    const next: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      enabledWidgets: migrateEnabledWidgets(parsed.enabledWidgets, fromVersion),
      widgetOrder: normalizeWidgetOrder(parsed.widgetOrder ?? parsed.enabledWidgets),
      widgetSpans: normalizeSpans(parsed.widgetSpans),
      settingsVersion: SETTINGS_VERSION,
    };
    // v4: CryptoZen lime replaces legacy teal glass accent
    if (fromVersion < 4) {
      const legacy = (parsed.accent ?? "").toLowerCase();
      if (!legacy || legacy === "#14b8a6" || legacy === "#14b8a6ff") {
        next.accent = "#5CEE15";
      }
    }
    // Migrate legacy weatherCoords into weatherLocations once
    if (!next.weatherLocations?.length && next.weatherCoords?.lat != null) {
      const c = next.weatherCoords;
      const id = `legacy-${c.lat.toFixed(3)}-${c.lon.toFixed(3)}`;
      next.weatherLocations = [
        {
          id,
          name: c.label?.split(",")[0]?.trim() || "Saved location",
          lat: c.lat,
          lon: c.lon,
        },
      ];
      next.weatherActiveId = id;
    }
    if (!next.weatherUnit) next.weatherUnit = "f";
    if (fromVersion < SETTINGS_VERSION) {
      saveSettings(next);
    }
    return next;
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      enabledWidgets: [...DEFAULT_SETTINGS.enabledWidgets],
      widgetOrder: [...WIDGET_IDS],
      widgetSpans: {},
    };
  }
}

export function saveSettings(next: UserSettings): UserSettings {
  const normalized: UserSettings = {
    ...next,
    enabledWidgets: normalizeEnabledWidgets(next.enabledWidgets),
    widgetOrder: normalizeWidgetOrder(next.widgetOrder ?? next.enabledWidgets),
    widgetSpans: normalizeSpans(next.widgetSpans),
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
