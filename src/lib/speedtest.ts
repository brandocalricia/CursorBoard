/** Client-side internet speed measurement helpers. */

export type SpeedPhase = "idle" | "latency" | "download" | "upload" | "done" | "error";

export type SpeedResult = {
  latencyMs: number | null;
  jitterMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  /** True when we used an external probe (not same-origin loopback). */
  internetPath: boolean;
  probedAt: string;
  error?: string;
};

function mbps(bytes: number, ms: number): number {
  if (ms <= 0) return 0;
  return (bytes * 8) / (ms / 1000) / 1_000_000;
}

/** Measure RTT with small HEAD/GET requests; prefer Cloudflare edge for real WAN path. */
export async function measureLatency(samples = 5): Promise<{
  latencyMs: number;
  jitterMs: number;
  internetPath: boolean;
}> {
  const times: number[] = [];
  let internetPath = false;

  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    try {
      const res = await fetch(
        `https://www.cloudflare.com/cdn-cgi/trace?_=${Date.now()}-${i}`,
        { cache: "no-store", mode: "cors" },
      );
      if (res.ok) {
        await res.text();
        times.push(performance.now() - start);
        internetPath = true;
        continue;
      }
    } catch {
      /* fall through to local */
    }

    const localStart = performance.now();
    const local = await fetch(`/api/speedtest?kb=64&_=${Date.now()}-${i}`, {
      cache: "no-store",
    });
    await local.arrayBuffer();
    times.push(performance.now() - localStart);
  }

  const sorted = [...times].sort((a, b) => a - b);
  const latencyMs = sorted[Math.floor(sorted.length / 2)] ?? 0;
  let jitter = 0;
  for (let i = 1; i < times.length; i++) {
    jitter += Math.abs(times[i]! - times[i - 1]!);
  }
  const jitterMs = times.length > 1 ? jitter / (times.length - 1) : 0;

  return {
    latencyMs: Math.round(latencyMs),
    jitterMs: Math.round(jitterMs),
    internetPath,
  };
}

/**
 * Download throughput.
 * Prefers Cloudflare ~1.5MB or 10MB binary (real internet). Falls back to
 * same-origin /api/speedtest (local loop — labeled as such by caller).
 */
export async function measureDownload(
  onProgress?: (mbpsSoFar: number) => void,
): Promise<{ mbps: number; internetPath: boolean }> {
  const probes: Array<{ url: string; expectedBytes?: number; internet: boolean }> = [
    {
      url: `https://speed.cloudflare.com/__down?bytes=${2_000_000}&_=${Date.now()}`,
      expectedBytes: 2_000_000,
      internet: true,
    },
    {
      url: `/api/speedtest?kb=2048&_=${Date.now()}`,
      expectedBytes: 2_048 * 1024,
      internet: false,
    },
  ];

  for (const probe of probes) {
    try {
      const start = performance.now();
      const res = await fetch(probe.url, { cache: "no-store", mode: probe.internet ? "cors" : "same-origin" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const elapsed = performance.now() - start;
      const rate = mbps(buf.byteLength, elapsed);
      onProgress?.(rate);
      if (buf.byteLength > 10_000) {
        return { mbps: Math.round(rate * 10) / 10, internetPath: probe.internet };
      }
    } catch {
      /* try next */
    }
  }

  throw new Error("Download probe failed");
}

/** Upload: POST random payload to local API (measures uplink to your machine's server). */
export async function measureUpload(
  onProgress?: (mbpsSoFar: number) => void,
): Promise<{ mbps: number; internetPath: boolean }> {
  const size = 512 * 1024;
  const body = new Uint8Array(size);
  // Browsers cap getRandomValues at 65536 bytes per call.
  const chunk = 65536;
  for (let i = 0; i < body.length; i += chunk) {
    crypto.getRandomValues(body.subarray(i, Math.min(i + chunk, body.length)));
  }

  // Prefer Cloudflare upload endpoint when CORS allows; else local echo.
  try {
    const start = performance.now();
    const res = await fetch(`https://speed.cloudflare.com/__up?_=${Date.now()}`, {
      method: "POST",
      body,
      cache: "no-store",
      mode: "cors",
    });
    if (res.ok || res.status === 200) {
      await res.arrayBuffer().catch(() => undefined);
      const rate = mbps(size, performance.now() - start);
      onProgress?.(rate);
      return { mbps: Math.round(rate * 10) / 10, internetPath: true };
    }
  } catch {
    /* local fallback */
  }

  const start = performance.now();
  const res = await fetch("/api/speedtest", {
    method: "POST",
    body,
    headers: { "content-type": "application/octet-stream" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Upload probe failed");
  await res.json();
  const rate = mbps(size, performance.now() - start);
  onProgress?.(rate);
  return { mbps: Math.round(rate * 10) / 10, internetPath: false };
}

export async function runFullSpeedTest(
  onPhase?: (phase: SpeedPhase, partial: Partial<SpeedResult>) => void,
): Promise<SpeedResult> {
  const result: SpeedResult = {
    latencyMs: null,
    jitterMs: null,
    downloadMbps: null,
    uploadMbps: null,
    internetPath: false,
    probedAt: new Date().toISOString(),
  };

  try {
    onPhase?.("latency", result);
    const lat = await measureLatency();
    result.latencyMs = lat.latencyMs;
    result.jitterMs = lat.jitterMs;
    result.internetPath = lat.internetPath;
    onPhase?.("download", { ...result });

    const down = await measureDownload((live) =>
      onPhase?.("download", { ...result, downloadMbps: Math.round(live * 10) / 10 }),
    );
    result.downloadMbps = down.mbps;
    result.internetPath = result.internetPath || down.internetPath;
    onPhase?.("upload", { ...result });

    const up = await measureUpload((live) =>
      onPhase?.("upload", { ...result, uploadMbps: Math.round(live * 10) / 10 }),
    );
    result.uploadMbps = up.mbps;
    result.internetPath = result.internetPath || up.internetPath;
    result.probedAt = new Date().toISOString();
    onPhase?.("done", result);
    return result;
  } catch (e) {
    result.error = e instanceof Error ? e.message : "Speed test failed";
    onPhase?.("error", result);
    return result;
  }
}
