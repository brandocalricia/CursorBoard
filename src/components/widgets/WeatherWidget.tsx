"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudSun } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSettings } from "@/components/providers/AppProviders";
import type { WeatherPayload } from "@/lib/types";

function codeLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code >= 95) return "Thunder";
  return "Mixed";
}

export function WeatherWidget() {
  const { settings, setSettings } = useSettings();
  const [data, setData] = useState<WeatherPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoDenied, setGeoDenied] = useState(false);

  const load = useCallback(
    async (lat: number, lon: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Weather unavailable");
        setData((await res.json()) as WeatherPayload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const cached = settings.weatherCoords;
    if (cached?.lat != null && cached?.lon != null) {
      void load(cached.lat, cached.lon);
      return;
    }
    if (!navigator.geolocation) {
      setGeoDenied(true);
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        void setSettings({ weatherCoords: { lat, lon } });
        void load(lat, lon);
      },
      () => {
        setGeoDenied(true);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 12_000 },
    );
  }, [load, setSettings, settings.weatherCoords]);

  const chart = (data?.hourly ?? []).map((h) => ({
    t: h.time.slice(11, 16),
    v: Math.round(h.tempC),
  }));

  return (
    <WidgetShell
      title="Weather"
      description={data ? codeLabel(data.weatherCode) : "Open-Meteo · your location"}
      loading={loading}
      error={error}
      onRetry={() => {
        const c = settings.weatherCoords;
        if (c) void load(c.lat, c.lon);
      }}
      empty={!loading && !error && (geoDenied || !data)}
      emptyNode={
        <EmptyState
          illustration="empty"
          title="Location needed"
          body="Allow location access so weather can use Open-Meteo near you. No API key required."
        />
      }
    >
      {data ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="stat-value text-4xl font-semibold text-[var(--accent)]">
                {Math.round(data.tempC)}°
              </p>
              <p className="text-xs text-muted-foreground">
                Feels {Math.round(data.feelsLikeC)}° · {data.humidity}% humidity ·{" "}
                {Math.round(data.windKmh)} km/h
              </p>
            </div>
            <CloudSun className="h-8 w-8 text-[var(--accent)] opacity-80" />
          </div>
          {chart.length > 1 ? (
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="wxFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" hide />
                  <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                  <ReTooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--accent)"
                    fill="url(#wxFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      ) : null}
    </WidgetShell>
  );
}
