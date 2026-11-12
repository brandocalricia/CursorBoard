import { z } from "zod";
import { WIDGET_IDS } from "./widgets/registry-meta";

export const themeModeSchema = z.enum(["dark", "light", "system"]);
export const densitySchema = z.enum(["compact", "comfortable", "spacious"]);
export const layoutPresetSchema = z.enum(["focus", "balanced", "dense"]);
export const themePackSchema = z.enum([
  "cryptozen",
  "amber",
  "monokai",
  "horizon",
  "obsidian",
  "daylight",
]);
export const widgetSpanSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const userSettingsSchema = z.object({
  theme: themeModeSchema.optional(),
  accent: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
    .optional(),
  density: densitySchema.optional(),
  layoutPreset: layoutPresetSchema.optional(),
  themePack: themePackSchema.optional(),
  enabledWidgets: z.array(z.string()).optional(),
  widgetOrder: z.array(z.string()).optional(),
  widgetSpans: z.record(z.string(), widgetSpanSchema).optional(),
  weatherCoords: z
    .object({
      lat: z.number(),
      lon: z.number(),
      label: z.string().optional(),
    })
    .nullable()
    .optional(),
  weatherLocations: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        admin1: z.string().optional(),
        country: z.string().optional(),
        lat: z.number(),
        lon: z.number(),
      }),
    )
    .optional(),
  weatherActiveId: z.string().nullable().optional(),
  weatherUnit: z.enum(["c", "f"]).optional(),
  settingsVersion: z.number().int().optional(),
});

export type SettingsPatch = z.infer<typeof userSettingsSchema>;

export function parseSettingsPatch(body: unknown): {
  ok: true;
  data: SettingsPatch;
} | { ok: false; error: string } {
  const parsed = userSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid_settings" };
  }
  const data = parsed.data;
  if (data.enabledWidgets) {
    data.enabledWidgets = data.enabledWidgets.filter((id) =>
      (WIDGET_IDS as readonly string[]).includes(id),
    );
  }
  if (data.widgetOrder) {
    data.widgetOrder = data.widgetOrder.filter((id) =>
      (WIDGET_IDS as readonly string[]).includes(id),
    );
  }
  return { ok: true, data };
}
