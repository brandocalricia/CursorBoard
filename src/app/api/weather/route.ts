import { NextResponse } from "next/server";
import type { WeatherPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat_lon_required" },
      { status: 400 },
    );
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
  );
  url.searchParams.set("hourly", "temperature_2m,weather_code");
  url.searchParams.set("forecast_hours", "12");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "open_meteo_failed" }, { status: 502 });
  }
  const json = (await res.json()) as {
    timezone?: string;
    current?: Record<string, number>;
    hourly?: { time: string[]; temperature_2m: number[]; weather_code: number[] };
  };

  const current = json.current ?? {};
  const hourlyTimes = json.hourly?.time ?? [];
  const payload: WeatherPayload = {
    lat,
    lon,
    timezone: json.timezone ?? "auto",
    tempC: Number(current.temperature_2m ?? 0),
    feelsLikeC: Number(current.apparent_temperature ?? current.temperature_2m ?? 0),
    weatherCode: Number(current.weather_code ?? 0),
    humidity: Number(current.relative_humidity_2m ?? 0),
    windKmh: Number(current.wind_speed_10m ?? 0),
    hourly: hourlyTimes.slice(0, 12).map((t, i) => ({
      time: t,
      tempC: Number(json.hourly?.temperature_2m?.[i] ?? 0),
      weatherCode: Number(json.hourly?.weather_code?.[i] ?? 0),
    })),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { "cache-control": "private, max-age=300" },
  });
}
