import { NextResponse } from "next/server";
import type { WeatherSearchHit } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] as WeatherSearchHit[] });
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return NextResponse.json(
      { error: "geocode_unreachable", results: [] as WeatherSearchHit[] },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "geocode_failed", results: [] as WeatherSearchHit[] },
      { status: 502 },
    );
  }

  const json = (await res.json()) as {
    results?: Array<{
      id: number;
      name: string;
      latitude: number;
      longitude: number;
      admin1?: string;
      country?: string;
      country_code?: string;
    }>;
  };

  const results: WeatherSearchHit[] = (json.results ?? []).map((r) => {
    const parts = [r.name, r.admin1, r.country].filter(Boolean);
    return {
      id: `geo-${r.id}`,
      name: r.name,
      admin1: r.admin1,
      country: r.country,
      lat: r.latitude,
      lon: r.longitude,
      label: parts.join(", "),
    };
  });

  return NextResponse.json(
    { results },
    { headers: { "cache-control": "private, max-age=300" } },
  );
}
