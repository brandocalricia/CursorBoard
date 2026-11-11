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
import type { UserSettings } from "@/lib/types";
import { WIDGET_IDS, normalizeEnabledWidgets } from "@/lib/widgets/registry-meta";

type Ctx = {
  settings: UserSettings;
  loading: boolean;
  setSettings: (patch: Partial<UserSettings>) => Promise<void>;
  toggleWidget: (id: string) => Promise<void>;
};

const SettingsContext = createContext<Ctx | null>(null);

const FALLBACK: UserSettings = {
  theme: "dark",
  accent: "#5CEE15",
  density: "comfortable",
  layoutPreset: "balanced",
  enabledWidgets: [...WIDGET_IDS],
};

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
    const apply = () => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dark =
        settings.theme === "dark" || (settings.theme === "system" && prefersDark);
      root.classList.toggle("light", !dark);
      root.classList.toggle("dark", dark);
      root.style.setProperty("--accent", settings.accent);
      root.dataset.density = settings.density;
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme, settings.accent, settings.density]);

  const setSettings = useCallback(async (patch: Partial<UserSettings>) => {
    setLocal((prev) => {
      const next = { ...prev, ...patch };
      void fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      return next;
    });
  }, []);

  const toggleWidget = useCallback(async (id: string) => {
    setLocal((prev) => {
      const enabled = prev.enabledWidgets.includes(id)
        ? prev.enabledWidgets.filter((w) => w !== id)
        : [...prev.enabledWidgets, id];
      const next = { ...prev, enabledWidgets: enabled };
      void fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, loading, setSettings, toggleWidget }),
    [settings, loading, setSettings, toggleWidget],
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
