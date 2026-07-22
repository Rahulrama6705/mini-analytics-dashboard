import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

/**
 * Builds a small, fully-known SQLite fixture and points the app's DB
 * client at it via env var override (see lib/db/client.ts). Call this
 * before importing any lib/data-sources module in a test file.
 */
export function setUpFixtureDb(): { dbPath: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coral-test-"));
  const dbPath = path.join(dir, "fixture.db");
  process.env.DASHBOARD_DB_PATH = dbPath;

  const schemaPath = path.join(process.cwd(), "lib", "db", "schema.sql");
  const db = new Database(dbPath);
  db.pragma("foreign_keys = OFF");
  db.exec(fs.readFileSync(schemaPath, "utf-8"));
  db.pragma("foreign_keys = ON");
  db.close();

  return {
    dbPath,
    cleanup: () => {
      fs.rmSync(dir, { recursive: true, force: true });
      delete process.env.DASHBOARD_DB_PATH;
    },
  };
}

export function rawDb(dbPath: string): Database.Database {
  return new Database(dbPath);
}
