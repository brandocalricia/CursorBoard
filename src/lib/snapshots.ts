import { sqlGet, sqlRun } from "./db";

/** Persist a provider/host payload and prune old rows for that source. */
export function cacheSnapshot(
  source: string,
  kind: string,
  payload: unknown,
  keepLast = 40,
) {
  try {
    sqlRun(
      `INSERT INTO metric_snapshots (source, kind, payload) VALUES (?, ?, ?)`,
      [source, kind, JSON.stringify(payload)],
    );
    sqlRun(
      `DELETE FROM metric_snapshots
       WHERE source = ?
         AND id NOT IN (
           SELECT id FROM metric_snapshots
           WHERE source = ?
           ORDER BY id DESC
           LIMIT ?
         )`,
      [source, source, keepLast],
    );
  } catch {
    /* ignore cache errors */
  }
}

export function readLatestSnapshot<T>(source: string, kind?: string): T | null {
  try {
    const row = kind
      ? sqlGet<{ payload: string }>(
          `SELECT payload FROM metric_snapshots
           WHERE source = ? AND kind = ?
           ORDER BY id DESC LIMIT 1`,
          [source, kind],
        )
      : sqlGet<{ payload: string }>(
          `SELECT payload FROM metric_snapshots
           WHERE source = ?
           ORDER BY id DESC LIMIT 1`,
          [source],
        );
    if (!row) return null;
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}
