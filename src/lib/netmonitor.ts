/** Lightweight client-side WAN probes for live latency sparkline. */

export type LatencySample = {
  t: string;
  ms: number;
};

export type LiveNetStatus = {
  online: boolean;
  latencyMs: number | null;
  samples: LatencySample[];
  effectiveType: string | null;
  downlinkHint: number | null;
  probedAt: string;
};

const MAX_SAMPLES = 24;

export async function probeLatency(): Promise<number | null> {
  const start = performance.now();
  try {
    const res = await fetch(
      `https://www.cloudflare.com/cdn-cgi/trace?_=${Date.now()}`,
      { cache: "no-store", mode: "cors" },
    );
    await res.text();
    if (!res.ok) throw new Error("bad");
    return Math.round(performance.now() - start);
  } catch {
    try {
      const t0 = performance.now();
      await fetch(`/api/health?_=${Date.now()}`, { cache: "no-store" });
      return Math.round(performance.now() - t0);
    } catch {
      return null;
    }
  }
}

export function pushSample(
  prev: LatencySample[],
  ms: number | null,
): LatencySample[] {
  if (ms == null) return prev;
  const next = [
    ...prev,
    { t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), ms },
  ];
  return next.slice(-MAX_SAMPLES);
}

export function connectionHints(): {
  effectiveType: string | null;
  downlinkHint: number | null;
} {
  const conn = (
    navigator as Navigator & {
      connection?: { downlink?: number; effectiveType?: string };
    }
  ).connection;
  return {
    effectiveType: conn?.effectiveType ?? null,
    downlinkHint: conn?.downlink ?? null,
  };
}
