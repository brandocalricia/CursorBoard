# Host metrics

High Dashboard collects **full machine telemetry** in-process because the app runs on your device.

## Schema (`host_metrics`)

- Identity: hostname, os, osVersion, kernel, arch, uptimeSec
- CPU: model, cores, usagePercent, loadAvg
- Memory: total/used/available + swap
- Disks: mount, fs, total/used/available GB
- Network interfaces: iface, ipv4
- GPUs: name, vendor, usage, VRAM, temp (`nvidia-smi` when present)
- Thermal: cpuTempC, gpuTempC[]
- Power: onBattery, batteryPercent, charging
- Meta: capturedAt, agentVersion, partial, source

## Sources

| Source | When |
|--------|------|
| `local` | Live collectors (`/api/host`) |
| `sample` | Fallback / demo |
| `browser` | Reserved for thin client estimates |

Linux (Fedora/Hyprland) reads `/proc`, `sysfs`/`hwmon`, `df`, and optional `nvidia-smi`.
