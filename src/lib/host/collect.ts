import { cpus, freemem, hostname, loadavg, platform, release, totalmem, arch, uptime, networkInterfaces } from "node:os";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { HostMetrics } from "../types";

const AGENT_VERSION = "0.1.0";

function safeExec(cmd: string, args: string[]): string | null {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      timeout: 2500,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
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
  return {
    memTotalMb,
    memUsedMb: Math.max(0, memTotalMb - memAvailableMb),
    memAvailableMb,
    swapTotalMb,
    swapUsedMb: Math.max(0, swapTotalMb - swapFreeMb),
  };
}

function cpuUsageEstimate(): number | null {
  const count = cpus().length || 1;
  if (platform() === "win32") return null;
  const [one] = loadavg();
  if (!Number.isFinite(one)) return null;
  return Math.max(0, Math.min(100, (one / count) * 100));
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
    if (!mount.startsWith("/")) continue;
    if (
      mount.startsWith("/snap") ||
      mount.startsWith("/boot") ||
      mount.startsWith("/dev") ||
      mount.startsWith("/run") ||
      mount.startsWith("/sys") ||
      mount.startsWith("/proc")
    ) {
      continue;
    }
    const totalKb = Number(blocks);
    const usedKb = Number(used);
    const availKb = Number(avail);
    if (!Number.isFinite(totalKb) || totalKb <= 0) continue;
    disks.push({
      mount,
      fs,
      totalGb: totalKb / 1024 / 1024,
      usedGb: usedKb / 1024 / 1024,
      availableGb: availKb / 1024 / 1024,
    });
  }
  return disks.slice(0, 8);
}

function collectGpus(): HostMetrics["gpus"] {
  const nvidia = safeExec("nvidia-smi", [
    "--query-gpu=name,utilization.gpu,memory.total,memory.used,temperature.gpu",
    "--format=csv,noheader,nounits",
  ]);
  if (nvidia) {
    return nvidia.split("\n").filter(Boolean).map((line) => {
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
  const hwmon = "/sys/class/hwmon";
  if (!existsSync(hwmon)) return null;
  try {
    for (const entry of readdirSync(hwmon)) {
      const namePath = `${hwmon}/${entry}/name`;
      const name = existsSync(namePath) ? readFileSync(namePath, "utf8").trim() : "";
      for (const file of readdirSync(`${hwmon}/${entry}`)) {
        if (!/^temp\d+_input$/.test(file)) continue;
        const raw = Number(readFileSync(`${hwmon}/${entry}/${file}`, "utf8").trim());
        if (!Number.isFinite(raw)) continue;
        const c = raw > 1000 ? raw / 1000 : raw;
        if (c > 0 && c < 150) {
          if (!name || /core|cpu|k10|zen|package/i.test(name) || true) return c;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

function collectBattery(): HostMetrics["power"] {
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

export function collectHostMetrics(): HostMetrics {
  let partial = false;
  const linuxMem = readMemLinux();
  const memory = linuxMem ?? {
    memTotalMb: totalmem() / 1024 / 1024,
    memUsedMb: (totalmem() - freemem()) / 1024 / 1024,
    memAvailableMb: freemem() / 1024 / 1024,
    swapTotalMb: 0,
    swapUsedMb: 0,
  };
  if (!linuxMem) partial = true;

  const cpuList = cpus();
  const usagePercent = cpuUsageEstimate();
  if (usagePercent == null) partial = true;

  const nets = networkInterfaces();
  const network: HostMetrics["network"] = [];
  for (const [iface, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    const v4 = addrs.find((a) => a.family === "IPv4" && !a.internal);
    if (!v4) continue;
    network.push({
      iface,
      ipv4: v4.address,
      bytesRecv: 0,
      bytesSent: 0,
    });
  }

  const gpus = collectGpus();
  const cpuTempC = collectCpuTemp();
  if (cpuTempC == null) partial = true;

  const load = platform() !== "win32" ? (loadavg() as [number, number, number]) : null;

  return {
    hostname: hostname(),
    os: mapOs(),
    osVersion: release(),
    kernel: release(),
    arch: arch(),
    uptimeSec: uptime(),
    cpu: {
      model: cpuList[0]?.model?.trim() || "Unknown CPU",
      coresPhysical: null,
      coresLogical: cpuList.length,
      usagePercent,
      loadAvg: load,
    },
    memory,
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
    network: [{ iface: "wlan0", ipv4: "192.168.1.42", bytesRecv: 0, bytesSent: 0 }],
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
