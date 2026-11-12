import { NextResponse } from "next/server";
import type { WeatherDay, WeatherHour, WeatherPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");
  const label = searchParams.get("label")?.trim() || undefined;

  if (latRaw == null || lonRaw == null || latRaw === "" || lonRaw === "") {
    return NextResponse.json({ error: "lat_lon_required" }, { status: 400 });
  }
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "lat_lon_invalid" }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "precipitation",
      "cloud_cover",
      "pressure_msl",
      "dew_point_2m",
    ].join(","),
  );
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "precipitation_probability",
      "precipitation",
      "wind_speed_10m",
      "uv_index",
    ].join(","),
  );
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "uv_index_max",
      "sunrise",
      "sunset",
    ].join(","),
  );
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("wind_speed_unit", "kmh");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "open_meteo_failed" }, { status: 502 });
  }

  const json = (await res.json()) as {
    timezone?: string;
    current?: Record<string, number | string>;
    hourly?: Record<string, Array<number | string | null>>;
    daily?: Record<string, Array<number | string | null>>;
  };

  const current = json.current ?? {};
  const hourlyTimes = (json.hourly?.time ?? []) as string[];
  const now = Date.now();
  // Start hourly from the current hour onward
  let startIdx = hourlyTimes.findIndex((t) => new Date(t).getTime() >= now - 30 * 60_000);
  if (startIdx < 0) startIdx = 0;

  const hourly: WeatherHour[] = hourlyTimes.slice(startIdx, startIdx + 24).map((t, i) => {
    const idx = startIdx + i;
    return {
      time: t,
      tempC: Number(json.hourly?.temperature_2m?.[idx] ?? 0),
      feelsLikeC: Number(json.hourly?.apparent_temperature?.[idx] ?? 0),
      weatherCode: Number(json.hourly?.weather_code?.[idx] ?? 0),
      precipProb: Number(json.hourly?.precipitation_probability?.[idx] ?? 0),
      precipMm: Number(json.hourly?.precipitation?.[idx] ?? 0),
      windKmh: Number(json.hourly?.wind_speed_10m?.[idx] ?? 0),
      uvIndex: Number(json.hourly?.uv_index?.[idx] ?? 0),
    };
  });

  const dailyDates = (json.daily?.time ?? []) as string[];
  const daily: WeatherDay[] = dailyDates.slice(0, 7).map((date, i) => ({
    date,
    weatherCode: Number(json.daily?.weather_code?.[i] ?? 0),
    highC: Number(json.daily?.temperature_2m_max?.[i] ?? 0),
    lowC: Number(json.daily?.temperature_2m_min?.[i] ?? 0),
    precipSumMm: Number(json.daily?.precipitation_sum?.[i] ?? 0),
    precipProbMax: Number(json.daily?.precipitation_probability_max?.[i] ?? 0),
    uvIndexMax: Number(json.daily?.uv_index_max?.[i] ?? 0),
    sunrise: String(json.daily?.sunrise?.[i] ?? ""),
    sunset: String(json.daily?.sunset?.[i] ?? ""),
  }));

  const currentUv = hourly[0]?.uvIndex ?? Number(daily[0]?.uvIndexMax ?? 0);

  const payload: WeatherPayload = {
    lat,
    lon,
    timezone: json.timezone ?? "auto",
    label,
    tempC: Number(current.temperature_2m ?? 0),
    feelsLikeC: Number(current.apparent_temperature ?? current.temperature_2m ?? 0),
    weatherCode: Number(current.weather_code ?? 0),
    humidity: Number(current.relative_humidity_2m ?? 0),
    windKmh: Number(current.wind_speed_10m ?? 0),
    windDirDeg: Number(current.wind_direction_10m ?? 0),
    gustKmh: Number(current.wind_gusts_10m ?? 0),
    precipMm: Number(current.precipitation ?? 0),
    cloudCover: Number(current.cloud_cover ?? 0),
    pressureHpa: Number(current.pressure_msl ?? 0),
    visibilityKm: null,
    uvIndex: currentUv,
    dewPointC:
      current.dew_point_2m != null ? Number(current.dew_point_2m) : null,
    sunrise: daily[0]?.sunrise,
    sunset: daily[0]?.sunset,
    highC: daily[0]?.highC,
    lowC: daily[0]?.lowC,
    hourly,
    daily,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { "cache-control": "private, max-age=180" },
  });
}
