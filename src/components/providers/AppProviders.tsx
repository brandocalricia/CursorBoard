"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserSettings, WidgetSpan } from "@/lib/types";
import {
  WIDGET_IDS,
  normalizeEnabledWidgets,
  normalizeWidgetOrder,
  type WidgetId,
} from "@/lib/widgets/registry-meta";

type Ctx = {
  settings: UserSettings;
  loading: boolean;
  setSettings: (patch: Partial<UserSettings>) => Promise<void>;
  toggleWidget: (id: string) => Promise<void>;
  moveWidget: (id: WidgetId, dir: -1 | 1) => Promise<void>;
  setWidgetSpan: (id: WidgetId, span: WidgetSpan) => Promise<void>;
};

const SettingsContext = createContext<Ctx | null>(null);

const FALLBACK: UserSettings = {
  theme: "dark",
  accent: "#5CEE15",
  density: "comfortable",
  layoutPreset: "balanced",
  themePack: "cryptozen",
  enabledWidgets: [...WIDGET_IDS],
  widgetOrder: [...WIDGET_IDS],
  widgetSpans: {},
  weatherCoords: null,
};

function persist(next: UserSettings) {
  void fetch("/api/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(next),
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [settings, setLocal] = useState<UserSettings>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as UserSettings;
          if (!cancelled) {
            setLocal({
              ...data,
              enabledWidgets: normalizeEnabledWidgets(data.enabledWidgets),
              widgetOrder: normalizeWidgetOrder(data.widgetOrder ?? data.enabledWidgets),
              widgetSpans: data.widgetSpans ?? {},
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const PACK_ACCENTS: Record<string, string> = {
      cryptozen: "#5CEE15",
      amber: "#f59e0b",
      monokai: "#a6e22e",
      horizon: "#7dd3fc",
      obsidian: "#e5e7eb",
      daylight: "#0f766e",
    };
    const apply = () => {
      const pack = settings.themePack ?? "cryptozen";
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const forceLight = pack === "daylight";
      const dark =
        !forceLight &&
        (settings.theme === "dark" || (settings.theme === "system" && prefersDark));
      root.classList.toggle("light", !dark || forceLight);
      root.classList.toggle("dark", dark && !forceLight);
      root.dataset.themePack = pack;
      root.style.setProperty(
        "--accent",
        pack !== "cryptozen" ? PACK_ACCENTS[pack] ?? settings.accent : settings.accent,
      );
      root.dataset.density = settings.density;
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme, settings.accent, settings.density, settings.themePack]);

  const setSettings = useCallback(async (patch: Partial<UserSettings>) => {
    setLocal((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const toggleWidget = useCallback(async (id: string) => {
    setLocal((prev) => {
      const enabled = prev.enabledWidgets.includes(id)
        ? prev.enabledWidgets.filter((w) => w !== id)
        : [...prev.enabledWidgets, id];
      const next = { ...prev, enabledWidgets: enabled };
      persist(next);
      return next;
    });
  }, []);

  const moveWidget = useCallback(async (id: WidgetId, dir: -1 | 1) => {
    setLocal((prev) => {
      const order = normalizeWidgetOrder(prev.widgetOrder);
      const idx = order.indexOf(id);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= order.length) return prev;
      const nextOrder = [...order];
      const tmp = nextOrder[idx]!;
      nextOrder[idx] = nextOrder[nextIdx]!;
      nextOrder[nextIdx] = tmp;
      const next = { ...prev, widgetOrder: nextOrder };
      persist(next);
      return next;
    });
  }, []);

  const setWidgetSpan = useCallback(async (id: WidgetId, span: WidgetSpan) => {
    setLocal((prev) => {
      const next = {
        ...prev,
        widgetSpans: { ...(prev.widgetSpans ?? {}), [id]: span },
      };
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      setSettings,
      toggleWidget,
      moveWidget,
      setWidgetSpan,
    }),
    [settings, loading, setSettings, toggleWidget, moveWidget, setWidgetSpan],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings requires AppProviders");
  return ctx;
}
