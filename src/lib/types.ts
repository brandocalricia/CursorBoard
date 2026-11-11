export type ThemeMode = "dark" | "light" | "system";
export type Density = "compact" | "comfortable" | "spacious";
export type LayoutPreset = "focus" | "balanced" | "dense";

export type WidgetSpan = 1 | 2 | 3;

export type UserSettings = {
  theme: ThemeMode;
  accent: string;
  density: Density;
  layoutPreset: LayoutPreset;
  enabledWidgets: string[];
  /** Display order of widgets (ids). Missing ids append in registry order. */
  widgetOrder?: string[];
  /** Per-widget column span override (1–3). */
  widgetSpans?: Partial<Record<string, WidgetSpan>>;
  /** Bumps when we need a one-time widget migration. */
  settingsVersion?: number;
};

export type HostMetrics = {
  hostname: string;
  os: "linux" | "darwin" | "windows" | "unknown";
  osVersion: string;
  kernel: string;
  arch: string;
  uptimeSec: number;
  cpu: {
    model: string;
    coresPhysical: number | null;
    coresLogical: number;
    usagePercent: number | null;
    loadAvg: [number, number, number] | null;
  };
  memory: {
    memTotalMb: number;
    memUsedMb: number;
    memAvailableMb: number;
    swapTotalMb: number;
    swapUsedMb: number;
  };
  disks: Array<{
    mount: string;
    fs: string;
    totalGb: number;
    usedGb: number;
    availableGb: number;
  }>;
  network: Array<{
    iface: string;
    ipv4?: string;
    ipv6?: string;
    bytesRecv: number;
    bytesSent: number;
    rxMbps?: number;
    txMbps?: number;
  }>;
  gpus: Array<{
    name: string;
    vendor: string;
    usagePercent?: number;
    vramTotalMb?: number;
    vramUsedMb?: number;
    tempC?: number;
  }>;
  thermal: {
    cpuTempC: number | null;
    gpuTempC: number[];
  };
  power: {
    onBattery: boolean | null;
    batteryPercent: number | null;
    charging: boolean | null;
    powerDrawW: number | null;
  };
  capturedAt: string;
  agentVersion: string;
  partial: boolean;
  source: "local" | "browser" | "sample";
};

export type GitHubPayload = {
  user: string;
  events: Array<{
    id: string;
    type: string;
    repo: string;
    summary: string;
    createdAt: string;
    url?: string;
    body?: string;
  }>;
  pullRequests: Array<{
    id: number;
    title: string;
    repo: string;
    url: string;
    updatedAt: string;
    state: string;
    body?: string;
  }>;
  sample: boolean;
};

export type CanvasAssignment = {
  id: string;
  courseId?: string;
  name: string;
  course: string;
  dueAt: string | null;
  points: number | null;
  htmlUrl: string;
  descriptionHtml?: string | null;
  descriptionText?: string | null;
};

export type CanvasPayload = {
  assignments: CanvasAssignment[];
  sample: boolean;
};

export type EmailItem = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  receivedAt: string;
  unread: boolean;
  priority: "high" | "normal" | "low";
  htmlUrl?: string;
};

export type EmailPayload = {
  messages: EmailItem[];
  sample: boolean;
};

export type NetworkProbe = {
  downlinkMbps: number | null;
  rttMs: number | null;
  effectiveType: string | null;
  online: boolean;
  probedAt: string;
  sample: boolean;
};

export type DetailLink = {
  url: string;
  label: string;
};

/** Shared detail sheet payload for click-through items */
export type DetailItem = {
  id: string;
  source: "canvas" | "github" | "email" | "system";
  title: string;
  subtitle?: string;
  meta?: string[];
  bodyHtml?: string | null;
  bodyText?: string | null;
  /** Primary destination on the real site */
  linkUrl?: string;
  linkLabel?: string;
  /** Extra destinations (repo, course home, mail app, docs) */
  links?: DetailLink[];
};
