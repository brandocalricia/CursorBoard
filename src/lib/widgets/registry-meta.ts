export const WIDGET_IDS = [
  "github",
  "canvas",
  "email",
  "host",
  "speed",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

/** Bump when shipping widgets that existing installs should auto-enable once. */
export const SETTINGS_VERSION = 2;

export type WidgetMeta = {
  id: WidgetId;
  title: string;
  description: string;
  category: "code" | "school" | "comms" | "system" | "network";
  colSpan: number;
  rowSpan: number;
  enabledByDefault: boolean;
};

export const WIDGET_META: WidgetMeta[] = [
  {
    id: "github",
    title: "GitHub",
    description: "Recent activity and open pull requests",
    category: "code",
    colSpan: 2,
    rowSpan: 2,
    enabledByDefault: true,
  },
  {
    id: "canvas",
    title: "Canvas",
    description: "Upcoming work — click for instructions",
    category: "school",
    colSpan: 2,
    rowSpan: 2,
    enabledByDefault: true,
  },
  {
    id: "email",
    title: "Email",
    description: "Unread and priority messages",
    category: "comms",
    colSpan: 2,
    rowSpan: 2,
    enabledByDefault: true,
  },
  {
    id: "host",
    title: "This machine",
    description: "CPU, memory, disk, GPU, power",
    category: "system",
    colSpan: 2,
    rowSpan: 3,
    enabledByDefault: true,
  },
  {
    id: "speed",
    title: "Internet speed",
    description: "Latency, download, and upload",
    category: "network",
    colSpan: 2,
    rowSpan: 2,
    enabledByDefault: true,
  },
];

const LEGACY_MAP: Record<string, WidgetId> = {
  network: "speed",
};

/** Map legacy ids and drop unknowns. Does not force-enable widgets. */
export function normalizeEnabledWidgets(ids: string[] | undefined | null): WidgetId[] {
  const mapped = (ids ?? []).map((id) => LEGACY_MAP[id] ?? id);
  const known = mapped.filter((id): id is WidgetId =>
    (WIDGET_IDS as readonly string[]).includes(id),
  );
  return known.length ? [...new Set(known)] : [...WIDGET_IDS];
}

/** One-time upgrade: rename legacy widgets and enable newly shipped defaults. */
export function migrateEnabledWidgets(
  ids: string[] | undefined | null,
  fromVersion: number,
): WidgetId[] {
  let next = normalizeEnabledWidgets(ids);
  if (fromVersion < 2) {
    const set = new Set(next);
    for (const meta of WIDGET_META) {
      if (meta.enabledByDefault) set.add(meta.id);
    }
    next = WIDGET_IDS.filter((id) => set.has(id));
  }
  return next;
}
