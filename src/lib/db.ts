import Database from "better-sqlite3";
import { getDbPath } from "./paths";

let db: Database.Database | null = null;

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      settings TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS metric_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      kind TEXT,
      payload TEXT NOT NULL,
      captured_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_metric_snapshots_source
      ON metric_snapshots(source, captured_at DESC);

    CREATE TABLE IF NOT EXISTS digests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body_md TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quick_links (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getDb(): Database.Database {
  if (db) return db;
  db = new Database(getDbPath());
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

export function sqlAll<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): T[] {
  return getDb().prepare(text).all(...params) as T[];
}

export function sqlGet<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): T | undefined {
  return getDb().prepare(text).get(...params) as T | undefined;
}

export function sqlRun(text: string, params: unknown[] = []) {
  return getDb().prepare(text).run(...params);
}
