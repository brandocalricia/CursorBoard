"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CloudSun, MapPin, Search, Trash2, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/providers/AppProviders";
import type { WeatherLocation, WeatherPayload, WeatherSearchHit } from "@/lib/types";
import {
  formatClock,
  formatWeekday,
  toDisplayTemp,
  uvLabel,
  weatherCodeLabel,
  windDirLabel,
} from "@/lib/weather";
import { cn } from "@/lib/utils";

export function WeatherWidget() {
  const { settings, setSettings } = useSettings();
  const unit = settings.weatherUnit === "c" ? "c" : "f";
  const activeId = settings.weatherActiveId ?? null;

  const [data, setData] = useState<WeatherPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoDenied, setGeoDenied] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<WeatherSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const locations = useMemo(
    () => settings.weatherLocations ?? [],
    [settings.weatherLocations],
  );

  const active = useMemo(
    () => locations.find((l) => l.id === activeId) ?? locations[0] ?? null,
    [locations, activeId],
  );

  const load = useCallback(async (lat: number, lon: number, label?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
      });
      if (label) qs.set("label", label);
      const res = await fetch(`/api/weather?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Weather unavailable");
      setData((await res.json()) as WeatherPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      void load(active.lat, active.lon, active.name);
      return;
    }
    const cached = settings.weatherCoords;
    if (cached?.lat != null && cached?.lon != null) {
      void load(cached.lat, cached.lon, cached.label);
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
        const id = `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`;
        const loc: WeatherLocation = {
          id,
          name: "Current location",
          lat,
          lon,
        };
        void setSettings({
          weatherCoords: { lat, lon, label: "Current location" },
          weatherLocations: [loc],
          weatherActiveId: id,
        });
        void load(lat, lon, "Current location");
      },
      () => {
        setGeoDenied(true);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 12_000 },
    );
  }, [active, load, setSettings, settings.weatherCoords]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const res = await fetch(`/api/weather/search?q=${encodeURIComponent(q)}`, {
            cache: "no-store",
          });
          if (!res.ok) return;
          const json = (await res.json()) as { results: WeatherSearchHit[] };
          setHits(json.results ?? []);
        } finally {
          setSearching(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(t);
  }, [query]);

  const saveLocation = async (hit: WeatherSearchHit) => {
    const loc: WeatherLocation = {
      id: hit.id,
      name: hit.name,
      admin1: hit.admin1,
      country: hit.country,
      lat: hit.lat,
      lon: hit.lon,
    };
    const next = [...locations.filter((l) => l.id !== loc.id), loc].slice(-8);
    await setSettings({
      weatherLocations: next,
      weatherActiveId: loc.id,
      weatherCoords: { lat: loc.lat, lon: loc.lon, label: hit.label },
    });
    setQuery("");
    setHits([]);
    void load(loc.lat, loc.lon, loc.name);
  };

  const removeLocation = async (id: string) => {
    const next = locations.filter((l) => l.id !== id);
    const nextActive =
      activeId === id ? (next[0]?.id ?? null) : activeId;
    await setSettings({
      weatherLocations: next,
      weatherActiveId: nextActive,
      weatherCoords: next[0]
        ? { lat: next[0].lat, lon: next[0].lon, label: next[0].name }
        : null,
    });
  };

  const chart = (data?.hourly ?? []).map((h) => ({
    t: formatClock(h.time, data?.timezone),
    v: toDisplayTemp(h.tempC, unit),
    p: h.precipProb,
  }));

  const unitSym = unit === "f" ? "°F" : "°C";

  return (
    <WidgetShell
      title="Weather"
      description={
        data
          ? `${weatherCodeLabel(data.weatherCode)}${data.label ? ` · ${data.label}` : active ? ` · ${active.name}` : ""}`
          : "Search a city · Open-Meteo"
      }
      loading={loading && !data && !query}
      error={error}
      onRetry={() => {
        if (active) void load(active.lat, active.lon, active.name);
      }}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city…"
              aria-label="Search weather city"
              className="h-8 w-full rounded-md border border-border bg-muted/40 pl-8 pr-8 text-sm outline-none ring-[var(--ring)] focus:ring-2"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear city search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setQuery("");
                  setHits([]);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Button
            size="sm"
            variant={unit === "f" ? "accent" : "outline"}
            aria-label="Use Fahrenheit"
            onClick={() => void setSettings({ weatherUnit: "f" })}
          >
            °F
          </Button>
          <Button
            size="sm"
            variant={unit === "c" ? "accent" : "outline"}
            aria-label="Use Celsius"
            onClick={() => void setSettings({ weatherUnit: "c" })}
          >
            °C
          </Button>
        </div>

        {hits.length || searching ? (
          <ul className="max-h-36 space-y-1 overflow-auto rounded-md border border-border bg-card p-1">
            {searching && !hits.length ? (
              <li className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</li>
            ) : null}
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="row-item w-full text-left"
                  onClick={() => void saveLocation(h)}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                    <span className="truncate">{h.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {locations.length ? (
          <div className="flex flex-wrap gap-1.5">
            {locations.map((l) => (
              <span
                key={l.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                  l.id === (active?.id ?? activeId)
                    ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]"
                    : "border-border bg-muted/40",
                )}
              >
                <button
                  type="button"
                  className="font-medium"
                  onClick={() =>
                    void setSettings({
                      weatherActiveId: l.id,
                      weatherCoords: { lat: l.lat, lon: l.lon, label: l.name },
                    })
                  }
                >
                  {l.name}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${l.name}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => void removeLocation(l.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {!data && !loading ? (
          <EmptyState
            illustration="empty"
            title={geoDenied ? "Pick a city" : "Loading location…"}
            body="Search above to save a city, or allow browser geolocation."
          />
        ) : null}

        {data ? (
          <>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="stat-value text-4xl font-semibold text-[var(--accent)]">
                  {toDisplayTemp(data.tempC, unit)}°
                </p>
                <p className="text-xs text-muted-foreground">
                  Feels {toDisplayTemp(data.feelsLikeC, unit)}° · H{" "}
                  {data.highC != null ? toDisplayTemp(data.highC, unit) : "—"}° / L{" "}
                  {data.lowC != null ? toDisplayTemp(data.lowC, unit) : "—"}°
                </p>
              </div>
              <CloudSun className="h-8 w-8 text-[var(--accent)] opacity-80" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md bg-muted/40 px-2 py-1.5">
                <p className="text-muted-foreground">Humidity</p>
                <p className="font-semibold">{data.humidity}%</p>
              </div>
              <div className="rounded-md bg-muted/40 px-2 py-1.5">
                <p className="text-muted-foreground">Wind</p>
                <p className="font-semibold">
                  {Math.round(data.windKmh)} km/h {windDirLabel(data.windDirDeg)}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 px-2 py-1.5">
                <p className="text-muted-foreground">UV</p>
                <p className="font-semibold">
                  {Math.round(data.uvIndex)} · {uvLabel(data.uvIndex)}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 px-2 py-1.5">
                <p className="text-muted-foreground">Pressure</p>
                <p className="font-semibold">{Math.round(data.pressureHpa)} hPa</p>
              </div>
              <div className="rounded-md bg-muted/40 px-2 py-1.5">
                <p className="text-muted-foreground">Sunrise</p>
                <p className="font-semibold">
                  {data.sunrise ? formatClock(data.sunrise, data.timezone) : "—"}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 px-2 py-1.5">
                <p className="text-muted-foreground">Sunset</p>
                <p className="font-semibold">
                  {data.sunset ? formatClock(data.sunset, data.timezone) : "—"}
                </p>
              </div>
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
                      formatter={(value) => [`${value}${unitSym}`, "Temp"]}
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

            {data.daily?.length ? (
              <ul className="space-y-1">
                {data.daily.slice(0, 7).map((d) => (
                  <li
                    key={d.date}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="w-10 font-medium">{formatWeekday(d.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {weatherCodeLabel(d.weatherCode)}
                      {d.precipProbMax > 20 ? ` · ${Math.round(d.precipProbMax)}%` : ""}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {toDisplayTemp(d.lowC, unit)}°
                    </span>
                    <span className="w-8 text-right tabular-nums font-semibold">
                      {toDisplayTemp(d.highC, unit)}°
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </WidgetShell>
  );
}
