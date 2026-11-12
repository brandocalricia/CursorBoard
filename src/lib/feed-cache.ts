import { sqlGet, sqlRun, getDb } from "./db";

/** Ensure feed_cache table exists (idempotent). */
export function ensureFeedCache() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS feed_cache (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function writeFeedCache(id: string, payload: unknown) {
  ensureFeedCache();
  sqlRun(
    `INSERT INTO feed_cache (id, payload, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = datetime('now')`,
    [id, JSON.stringify(payload)],
  );
}

export function readFeedCache<T>(id: string, maxAgeMs = 30 * 60_000): T | null {
  ensureFeedCache();
  const row = sqlGet<{ payload: string; updated_at: string }>(
    "SELECT payload, updated_at FROM feed_cache WHERE id = ?",
    [id],
  );
  if (!row) return null;
  const raw = row.updated_at.trim();
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const stamped = Date.parse(iso.endsWith("Z") ? iso : `${iso}Z`);
  const ms = Number.isFinite(stamped) ? Date.now() - stamped : 0;
  if (ms > maxAgeMs) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}
