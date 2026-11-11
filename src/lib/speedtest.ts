/** Client-side internet speed measurement — sustained like Cloudflare / Ookla. */

export type SpeedPhase = "idle" | "latency" | "download" | "upload" | "done" | "error";

export type SpeedResult = {
  latencyMs: number | null;
  jitterMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  /** True when we used an external probe (not same-origin loopback). */
  internetPath: boolean;
  /** How long download/upload phases ran (ms). */
  downloadMs?: number;
  uploadMs?: number;
  probedAt: string;
  error?: string;
};

/** Real speed tests sustain traffic for several seconds, not a single tiny GET. */
const LATENCY_SAMPLES = 12;
const DOWNLOAD_DURATION_MS = 12_000;
const UPLOAD_DURATION_MS = 10_000;
const DOWNLOAD_PARALLEL = 4;
const UPLOAD_PARALLEL = 3;
/** Per-request payload — large enough that TCP ramps into the measurement window. */
const DOWNLOAD_CHUNK_BYTES = 25_000_000; // 25 MiB
const UPLOAD_CHUNK_BYTES = 4_000_000; // 4 MiB
const LOCAL_DOWNLOAD_KB = 8192;

function mbps(bytes: number, ms: number): number {
  if (ms <= 0) return 0;
  return (bytes * 8) / (ms / 1000) / 1_000_000;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function fillRandom(size: number): Blob {
  const bytes = new Uint8Array(size);
  const chunk = 65536; // browser getRandomValues cap
  for (let i = 0; i < bytes.length; i += chunk) {
    crypto.getRandomValues(bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return new Blob([bytes], { type: "application/octet-stream" });
}

/** Measure RTT with small GETs; prefer Cloudflare edge for real WAN path. */
export async function measureLatency(samples = LATENCY_SAMPLES): Promise<{
  latencyMs: number;
  jitterMs: number;
  internetPath: boolean;
}> {
  const times: number[] = [];
  let internetPath = false;

  // Warm-up (discarded) so TCP/TLS handshake doesn’t inflate the median
  try {
    await fetch(`https://www.cloudflare.com/cdn-cgi/trace?_=${Date.now()}-warm`, {
      cache: "no-store",
      mode: "cors",
    });
  } catch {
    /* ignore */
  }

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
 * Sustained multi-stream download (~12s, 4 parallel) against Cloudflare,
 * matching how public speed tests fill the pipe before reporting.
 */
export async function measureDownload(
  onProgress?: (mbpsSoFar: number) => void,
  signal?: AbortSignal,
): Promise<{ mbps: number; internetPath: boolean; durationMs: number }> {
  const started = performance.now();
  let totalBytes = 0;
  let internetOk = false;

  const tick = () => {
    const elapsed = performance.now() - started;
    onProgress?.(round1(mbps(totalBytes, elapsed)));
  };

  async function streamCloudflare(): Promise<void> {
    while (performance.now() - started < DOWNLOAD_DURATION_MS) {
      if (signal?.aborted) return;
      const remaining = DOWNLOAD_DURATION_MS - (performance.now() - started);
      if (remaining < 200) break;
      const url = `https://speed.cloudflare.com/__down?bytes=${DOWNLOAD_CHUNK_BYTES}&_=${Date.now()}-${Math.random()}`;
      const res = await fetch(url, { cache: "no-store", mode: "cors", signal });
      if (!res.ok) throw new Error(`CF down HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      totalBytes += buf.byteLength;
      internetOk = true;
      tick();
    }
  }

  try {
    await Promise.all(
      Array.from({ length: DOWNLOAD_PARALLEL }, () => streamCloudflare()),
    );
  } catch {
    /* fall back to sustained local if Cloudflare blocked */
  }

  if (totalBytes < 500_000) {
    // Sustained local fallback (still multi-second) so we never report a 200ms flash
    totalBytes = 0;
    internetOk = false;
    const localStart = performance.now();
    while (performance.now() - localStart < DOWNLOAD_DURATION_MS) {
      if (signal?.aborted) break;
      const res = await fetch(
        `/api/speedtest?kb=${LOCAL_DOWNLOAD_KB}&_=${Date.now()}`,
        { cache: "no-store", signal },
      );
      if (!res.ok) break;
      const buf = await res.arrayBuffer();
      totalBytes += buf.byteLength;
      tick();
    }
  }

  const durationMs = Math.max(1, performance.now() - started);
  if (totalBytes < 50_000) throw new Error("Download probe failed");
  return {
    mbps: round1(mbps(totalBytes, durationMs)),
    internetPath: internetOk,
    durationMs: Math.round(durationMs),
  };
}

/**
 * Sustained multi-stream upload (~10s, 3 parallel). Prefers Cloudflare `__up`,
 * else local echo — still held for the full duration.
 */
export async function measureUpload(
  onProgress?: (mbpsSoFar: number) => void,
  signal?: AbortSignal,
): Promise<{ mbps: number; internetPath: boolean; durationMs: number }> {
  const body = fillRandom(UPLOAD_CHUNK_BYTES);
  const chunkBytes = UPLOAD_CHUNK_BYTES;
  const started = performance.now();
  let totalBytes = 0;
  let internetOk = false;

  const tick = () => {
    const elapsed = performance.now() - started;
    onProgress?.(round1(mbps(totalBytes, elapsed)));
  };

  async function postOnce(url: string, internet: boolean): Promise<boolean> {
    try {
      const res = await fetch(url, {
        method: "POST",
        body,
        cache: "no-store",
        mode: internet ? "cors" : "same-origin",
        headers: internet ? undefined : { "content-type": "application/octet-stream" },
        signal,
      });
      if (!(res.ok || res.status === 200)) return false;
      await res.arrayBuffer().catch(() => undefined);
      totalBytes += chunkBytes;
      if (internet) internetOk = true;
      tick();
      return true;
    } catch {
      return false;
    }
  }

  async function streamUpload(preferInternet: boolean): Promise<void> {
    while (performance.now() - started < UPLOAD_DURATION_MS) {
      if (signal?.aborted) return;
      const remaining = UPLOAD_DURATION_MS - (performance.now() - started);
      if (remaining < 200) break;
      if (preferInternet) {
        const ok = await postOnce(
          `https://speed.cloudflare.com/__up?_=${Date.now()}-${Math.random()}`,
          true,
        );
        if (!ok) {
          await postOnce("/api/speedtest", false);
        }
      } else {
        await postOnce("/api/speedtest", false);
      }
    }
  }

  await Promise.all(
    Array.from({ length: UPLOAD_PARALLEL }, () => streamUpload(true)),
  );

  // If Cloudflare never accepted bytes, run a full local sustained window
  if (totalBytes < 200_000) {
    totalBytes = 0;
    internetOk = false;
    const localStart = performance.now();
    while (performance.now() - localStart < UPLOAD_DURATION_MS) {
      if (signal?.aborted) break;
      await postOnce("/api/speedtest", false);
    }
  }

  const durationMs = Math.max(1, performance.now() - started);
  if (totalBytes < 20_000) throw new Error("Upload probe failed");
  return {
    mbps: round1(mbps(totalBytes, durationMs)),
    internetPath: internetOk,
    durationMs: Math.round(durationMs),
  };
}

export async function runFullSpeedTest(
  onPhase?: (phase: SpeedPhase, partial: Partial<SpeedResult>) => void,
  signal?: AbortSignal,
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

    const down = await measureDownload(
      (live) => onPhase?.("download", { ...result, downloadMbps: live }),
      signal,
    );
    result.downloadMbps = down.mbps;
    result.downloadMs = down.durationMs;
    result.internetPath = result.internetPath || down.internetPath;
    onPhase?.("upload", { ...result });

    const up = await measureUpload(
      (live) => onPhase?.("upload", { ...result, uploadMbps: live }),
      signal,
    );
    result.uploadMbps = up.mbps;
    result.uploadMs = up.durationMs;
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

export const SPEEDTEST_META = {
  latencySamples: LATENCY_SAMPLES,
  downloadSeconds: DOWNLOAD_DURATION_MS / 1000,
  uploadSeconds: UPLOAD_DURATION_MS / 1000,
  downloadParallel: DOWNLOAD_PARALLEL,
  uploadParallel: UPLOAD_PARALLEL,
} as const;
