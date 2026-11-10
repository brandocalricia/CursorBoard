export const WIDGET_IDS = [
  "github",
  "canvas",
  "host",
  "network",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export type WidgetMeta = {
  id: WidgetId;
  title: string;
  description: string;
  category: "code" | "school" | "system" | "network";
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
    description: "Upcoming assignments and deadlines",
    category: "school",
    colSpan: 2,
    rowSpan: 2,
    enabledByDefault: true,
  },
  {
    id: "host",
    title: "Host",
    description: "CPU, memory, disk, GPU, thermal, power",
    category: "system",
    colSpan: 2,
    rowSpan: 3,
    enabledByDefault: true,
  },
  {
    id: "network",
    title: "Network",
    description: "WAN probe and connection quality",
    category: "network",
    colSpan: 1,
    rowSpan: 1,
    enabledByDefault: true,
  },
];
