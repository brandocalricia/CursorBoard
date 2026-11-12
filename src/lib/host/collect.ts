import {
  arch,
  cpus,
  freemem,
  hostname,
  loadavg,
  networkInterfaces,
  platform,
  release,
  totalmem,
  uptime,
} from "node:os";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { HostMetrics } from "../types";

const AGENT_VERSION = "0.2.0";

/** Previous samples for rate / CPU deltas (process-local). */
let prevCpu: { idle: number; total: number; at: number } | null = null;
const prevNet: Map<string, { rx: number; tx: number; at: number }> = new Map();

function safeExec(cmd: string, args: string[], timeout = 2500): string | null {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      timeout,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function pageSizeDarwin(): number {
  const out = safeExec("pagesize", []);
  const n = out ? Number(out) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 16384;
}

/** Accurate macOS memory via vm_stat — Node freemem() is nearly useless here. */
function readMemDarwin(): HostMetrics["memory"] | null {
  const raw = safeExec("vm_stat", []);
  if (!raw) return null;
  const page = pageSizeDarwin();
  const get = (label: string) => {
    const m = raw.match(new RegExp(`${label}:\\s+([\\d.]+)`));
    return m ? Math.round(Number(m[1])) : 0;
  };
  const free = get("Pages free");
  const active = get("Pages active");
  const inactive = get("Pages inactive");
  const speculative = get("Pages speculative");
  const wired = get("Pages wired down");
  const purgeable = get("Pages purgeable");
  const compressed = get("Pages occupied by compressor");

  const totalMb = totalmem() / 1024 / 1024;
  // App-used ≈ active + wired + compressed (matches Activity Monitor “Memory Used” closely)
  const usedPages = active + wired + compressed;
  const availPages = free + inactive + speculative + purgeable;
  const memUsedMb = (usedPages * page) / 1024 / 1024;
  const memAvailableMb = Math.max(
    0,
    Math.min(totalMb, (availPages * page) / 1024 / 1024),
  );

  // Swap via sysctl
  const swapUsed = safeExec("sysctl", ["-n", "vm.swapusage"]);
  let swapTotalMb = 0;
  let swapUsedMb = 0;
  if (swapUsed) {
    const totalM = swapUsed.match(/total\s*=\s*([\d.]+)([MG])/i);
    const usedM = swapUsed.match(/used\s*=\s*([\d.]+)([MG])/i);
    const toMb = (n: number, u: string) => (u.toUpperCase() === "G" ? n * 1024 : n);
    if (totalM) swapTotalMb = toMb(Number(totalM[1]), totalM[2]!);
    if (usedM) swapUsedMb = toMb(Number(usedM[1]), usedM[2]!);
  }

  return {
    memTotalMb: totalMb,
    memUsedMb: Math.min(totalMb, Math.max(0, memUsedMb)),
    memAvailableMb,
    swapTotalMb,
    swapUsedMb,
  };
}

function readMemLinux(): HostMetrics["memory"] | null {
  if (!existsSync("/proc/meminfo")) return null;
  const text = readFileSync("/proc/meminfo", "utf8");
  const get = (key: string) => {
    const m = text.match(new RegExp(`${key}:\\s+(\\d+)`));
    return m ? Number(m[1]) / 1024 : 0;
  };
  const memTotalMb = get("MemTotal");
  const memAvailableMb = get("MemAvailable");
  const swapTotalMb = get("SwapTotal");
  const swapFreeMb = get("SwapFree");
  // Prefer MemAvailable-based used (excludes reclaimable cache) — not MemTotal-MemFree
  return {
    memTotalMb,
    memUsedMb: Math.max(0, memTotalMb - memAvailableMb),
    memAvailableMb,
    swapTotalMb,
    swapUsedMb: Math.max(0, swapTotalMb - swapFreeMb),
  };
}

function readMemFallback(): HostMetrics["memory"] {
  const total = totalmem() / 1024 / 1024;
  const free = freemem() / 1024 / 1024;
  return {
    memTotalMb: total,
    memUsedMb: Math.max(0, total - free),
    memAvailableMb: free,
    swapTotalMb: 0,
    swapUsedMb: 0,
  };
}

/** True CPU % from idle delta across os.cpus() times. */
function cpuUsagePercent(): number | null {
  const list = cpus();
  if (!list.length) return null;
  let idle = 0;
  let total = 0;
  for (const c of list) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  const now = Date.now();
  let pct: number | null = null;
  if (prevCpu && total > prevCpu.total) {
    const dIdle = idle - prevCpu.idle;
    const dTotal = total - prevCpu.total;
    if (dTotal > 0) {
      pct = Math.max(0, Math.min(100, (1 - dIdle / dTotal) * 100));
    }
  }
  prevCpu = { idle, total, at: now };
  return pct;
}

function collectDisks(): HostMetrics["disks"] {
  const out = safeExec("df", ["-kP"]);
  if (!out) return [];
  const lines = out.split("\n").slice(1);
  const disks: HostMetrics["disks"] = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;
    const [fs, blocks, used, avail, , mount] = parts;
    if (!mount?.startsWith("/")) continue;
    if (
      mount.startsWith("/snap") ||
      mount.startsWith("/boot") ||
      mount.startsWith("/dev") ||
      mount.startsWith("/run") ||
      mount.startsWith("/sys") ||
      mount.startsWith("/proc") ||
      mount.startsWith("/System/Volumes") ||
      mount === "/private/var/vm"
    ) {
      continue;
    }
    const totalKb = Number(blocks);
    const usedKb = Number(used);
    const availKb = Number(avail);
    if (!Number.isFinite(totalKb) || totalKb <= 0) continue;
    disks.push({
      mount,
      fs: fs ?? "disk",
      totalGb: totalKb / 1024 / 1024,
      usedGb: usedKb / 1024 / 1024,
      availableGb: availKb / 1024 / 1024,
    });
  }
  return disks.slice(0, 8);
}

function readNetDevLinux(): Map<string, { rx: number; tx: number }> {
  const map = new Map<string, { rx: number; tx: number }>();
  if (!existsSync("/proc/net/dev")) return map;
  const lines = readFileSync("/proc/net/dev", "utf8").split("\n").slice(2);
  for (const line of lines) {
    const m = line.trim().match(/^([^:]+):\s*(.+)$/);
    if (!m) continue;
    const iface = m[1]!.trim();
    const cols = m[2]!.trim().split(/\s+/);
    const rx = Number(cols[0]);
    const tx = Number(cols[8]);
    if (Number.isFinite(rx) && Number.isFinite(tx)) map.set(iface, { rx, tx });
  }
  return map;
}

function readNetDevDarwin(): Map<string, { rx: number; tx: number }> {
  const map = new Map<string, { rx: number; tx: number }>();
  const out = safeExec("netstat", ["-ib"]);
  if (!out) return map;
  const lines = out.split("\n").slice(1);
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    // Name Mtu Network Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes ...
    if (parts.length < 10) continue;
    const iface = parts[0]!;
    if (iface === "Name" || iface.startsWith("lo")) continue;
    const ibytes = Number(parts[6]);
    const obytes = Number(parts[9]);
    if (!Number.isFinite(ibytes) || !Number.isFinite(obytes)) continue;
    // netstat -ib can list link + address rows; keep max counters per iface
    const prev = map.get(iface);
    if (!prev || ibytes >= prev.rx) map.set(iface, { rx: ibytes, tx: obytes });
  }
  return map;
}

function collectNetwork(): HostMetrics["network"] {
  const addrs = networkInterfaces();
  const counters =
    platform() === "linux"
      ? readNetDevLinux()
      : platform() === "darwin"
        ? readNetDevDarwin()
        : new Map();
  const now = Date.now();
  const network: HostMetrics["network"] = [];

  const ifaces = new Set<string>([
    ...Object.keys(addrs ?? {}),
    ...counters.keys(),
  ]);

  for (const iface of ifaces) {
    if (iface.startsWith("lo") || iface === "lo0") continue;
    const list = addrs?.[iface];
    const v4 = list?.find((a) => a.family === "IPv4" && !a.internal);
    const v6 = list?.find((a) => a.family === "IPv6" && !a.internal);
    if (!v4 && !v6 && !counters.has(iface)) continue;

    const c = counters.get(iface) ?? { rx: 0, tx: 0 };
    let rxMbps: number | undefined;
    let txMbps: number | undefined;
    const prev = prevNet.get(iface);
    if (prev && now > prev.at) {
      const dt = (now - prev.at) / 1000;
      if (dt > 0.2) {
        rxMbps = Math.max(0, ((c.rx - prev.rx) * 8) / dt / 1_000_000);
        txMbps = Math.max(0, ((c.tx - prev.tx) * 8) / dt / 1_000_000);
      }
    }
    prevNet.set(iface, { rx: c.rx, tx: c.tx, at: now });

    network.push({
      iface,
      ipv4: v4?.address,
      ipv6: v6?.address,
      bytesRecv: c.rx,
      bytesSent: c.tx,
      rxMbps: rxMbps != null ? Math.round(rxMbps * 100) / 100 : undefined,
      txMbps: txMbps != null ? Math.round(txMbps * 100) / 100 : undefined,
    });
  }

  return network.sort((a, b) => {
    const aScore = (a.rxMbps ?? 0) + (a.txMbps ?? 0) + (a.ipv4 ? 1 : 0);
    const bScore = (b.rxMbps ?? 0) + (b.txMbps ?? 0) + (b.ipv4 ? 1 : 0);
    return bScore - aScore;
  });
}

function collectGpus(): HostMetrics["gpus"] {
  const nvidia = safeExec("nvidia-smi", [
    "--query-gpu=name,utilization.gpu,memory.total,memory.used,temperature.gpu",
    "--format=csv,noheader,nounits",
  ]);
  if (nvidia) {
    return nvidia
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, util, memTotal, memUsed, temp] = line.split(",").map((s) => s.trim());
        return {
          name: name || "NVIDIA GPU",
          vendor: "nvidia",
          usagePercent: Number(util) || undefined,
          vramTotalMb: Number(memTotal) || undefined,
          vramUsedMb: Number(memUsed) || undefined,
          tempC: Number(temp) || undefined,
        };
      });
  }
  return [];
}

function collectCpuTemp(): number | null {
  if (platform() === "darwin") {
    // No reliable public sysctl; leave null rather than fake
    return null;
  }
  const hwmon = "/sys/class/hwmon";
  if (!existsSync(hwmon)) return null;
  try {
    for (const entry of readdirSync(hwmon)) {
      for (const file of readdirSync(`${hwmon}/${entry}`)) {
        if (!/^temp\d+_input$/.test(file)) continue;
        const raw = Number(readFileSync(`${hwmon}/${entry}/${file}`, "utf8").trim());
        if (!Number.isFinite(raw)) continue;
        const c = raw > 1000 ? raw / 1000 : raw;
        if (c > 0 && c < 150) return c;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function collectBattery(): HostMetrics["power"] {
  if (platform() === "darwin") {
    const out = safeExec("pmset", ["-g", "batt"]);
    if (out) {
      const pct = out.match(/(\d+)%/);
      const charging = /charging/i.test(out) && !/discharging/i.test(out);
      const onBattery = /discharging/i.test(out) || /Battery Power/i.test(out);
      return {
        onBattery,
        batteryPercent: pct ? Number(pct[1]) : null,
        charging,
        powerDrawW: null,
      };
    }
  }
  const base = "/sys/class/power_supply";
  if (!existsSync(base)) {
    return { onBattery: null, batteryPercent: null, charging: null, powerDrawW: null };
  }
  try {
    for (const entry of readdirSync(base)) {
      const typePath = `${base}/${entry}/type`;
      if (!existsSync(typePath)) continue;
      const type = readFileSync(typePath, "utf8").trim();
      if (type !== "Battery") continue;
      const cap = existsSync(`${base}/${entry}/capacity`)
        ? Number(readFileSync(`${base}/${entry}/capacity`, "utf8").trim())
        : null;
      const status = existsSync(`${base}/${entry}/status`)
        ? readFileSync(`${base}/${entry}/status`, "utf8").trim()
        : "";
      return {
        onBattery: status === "Discharging",
        batteryPercent: Number.isFinite(cap as number) ? (cap as number) : null,
        charging: status === "Charging" || status === "Full",
        powerDrawW: null,
      };
    }
  } catch {
    /* ignore */
  }
  return { onBattery: false, batteryPercent: null, charging: null, powerDrawW: null };
}

function mapOs(): HostMetrics["os"] {
  const p = platform();
  if (p === "linux") return "linux";
  if (p === "darwin") return "darwin";
  if (p === "win32") return "windows";
  return "unknown";
}

function physicalCores(): number | null {
  if (platform() === "darwin") {
    const n = Number(safeExec("sysctl", ["-n", "hw.physicalcpu"]));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (platform() === "linux" && existsSync("/proc/cpuinfo")) {
    const text = readFileSync("/proc/cpuinfo", "utf8");
    const ids = new Set(
      [...text.matchAll(/^core id\s*:\s*(\d+)/gm)].map((m) => m[1]),
    );
    return ids.size || null;
  }
  return null;
}

/**
 * Prime CPU delta so the first HTTP poll after boot already has a sample.
 * Call once at module load with a short delay via setTimeout from the API route.
 */
export function primeCpuSample() {
  cpuUsagePercent();
}

export function collectHostMetrics(): HostMetrics {
  let partial = false;

  const memory =
    platform() === "darwin"
      ? readMemDarwin() ?? ((partial = true), readMemFallback())
      : readMemLinux() ?? ((partial = true), readMemFallback());

  // Two-pass CPU if we have no previous sample yet (first request)
  let usagePercent = cpuUsagePercent();
  if (usagePercent == null) {
    const start = Date.now();
    while (Date.now() - start < 180) {
      /* brief busy-wait for measurable delta — only on cold start */
    }
    usagePercent = cpuUsagePercent();
  }
  if (usagePercent == null) partial = true;

  const cpuList = cpus();
  const gpus = collectGpus();
  const cpuTempC = collectCpuTemp();
  if (cpuTempC == null && platform() === "linux") partial = true;

  const load = platform() !== "win32" ? (loadavg() as [number, number, number]) : null;
  const network = collectNetwork();

  return {
    hostname: hostname(),
    os: mapOs(),
    osVersion: release(),
    kernel: release(),
    arch: arch(),
    uptimeSec: uptime(),
    cpu: {
      model: cpuList[0]?.model?.trim() || "Unknown CPU",
      coresPhysical: physicalCores(),
      coresLogical: cpuList.length,
      usagePercent: usagePercent != null ? Math.round(usagePercent * 10) / 10 : null,
      loadAvg: load,
    },
    memory: {
      memTotalMb: Math.round(memory.memTotalMb * 10) / 10,
      memUsedMb: Math.round(memory.memUsedMb * 10) / 10,
      memAvailableMb: Math.round(memory.memAvailableMb * 10) / 10,
      swapTotalMb: Math.round(memory.swapTotalMb * 10) / 10,
      swapUsedMb: Math.round(memory.swapUsedMb * 10) / 10,
    },
    disks: collectDisks(),
    network,
    gpus,
    thermal: {
      cpuTempC,
      gpuTempC: gpus.map((g) => g.tempC).filter((n): n is number => n != null),
    },
    power: collectBattery(),
    capturedAt: new Date().toISOString(),
    agentVersion: AGENT_VERSION,
    partial,
    source: "local",
  };
}

export function sampleHostMetrics(): HostMetrics {
  return {
    hostname: "high-dashboard-dev",
    os: "linux",
    osVersion: "6.12",
    kernel: "6.12.0",
    arch: "x64",
    uptimeSec: 86400,
    cpu: {
      model: "Sample CPU 16-core",
      coresPhysical: 8,
      coresLogical: 16,
      usagePercent: 27,
      loadAvg: [1.2, 0.9, 0.7],
    },
    memory: {
      memTotalMb: 65536,
      memUsedMb: 28400,
      memAvailableMb: 37136,
      swapTotalMb: 8192,
      swapUsedMb: 120,
    },
    disks: [
      { mount: "/", fs: "/dev/nvme0n1p2", totalGb: 980, usedGb: 420, availableGb: 560 },
    ],
    network: [
      {
        iface: "wlan0",
        ipv4: "192.168.1.42",
        bytesRecv: 1_200_000_000,
        bytesSent: 340_000_000,
        rxMbps: 42.5,
        txMbps: 8.2,
      },
    ],
    gpus: [
      {
        name: "Sample GPU",
        vendor: "nvidia",
        usagePercent: 12,
        vramTotalMb: 12288,
        vramUsedMb: 2100,
        tempC: 48,
      },
    ],
    thermal: { cpuTempC: 52, gpuTempC: [48] },
    power: { onBattery: false, batteryPercent: null, charging: null, powerDrawW: null },
    capturedAt: new Date().toISOString(),
    agentVersion: AGENT_VERSION,
    partial: false,
    source: "sample",
  };
}
