import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

export function getDataDir(): string {
  const override = process.env.HIGH_DASHBOARD_HOME?.trim();
  const dir = override || join(homedir(), ".high-dashboard");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDbPath(): string {
  return join(getDataDir(), "high-dashboard.db");
}
