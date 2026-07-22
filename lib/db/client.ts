import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Local SQLite standing in for Supabase (Postgres) + Stripe. When wiring up
// the real sources: replace this module's usage inside lib/data-sources/*
// with a Supabase client for students/courses/enrollments and the Stripe
// SDK for charges/subscriptions/refunds. Keep the exported function
// signatures in lib/data-sources/ unchanged so callers don't need to change.
// Overridable so tests can point at an isolated fixture database instead
// of the real seeded one.
const SOURCE_DB_PATH = process.env.DASHBOARD_DB_PATH ?? path.join(process.cwd(), "data", "coral.db");

// Vercel's deployed filesystem is read-only outside of /tmp. The seeded DB
// ships in the deployment bundle read-only, so on cold start it's copied
// into /tmp (the one writable path at runtime) and opened from there.
function resolveDbPath(): string {
  if (!process.env.VERCEL) return SOURCE_DB_PATH;
  const tmpPath = path.join(os.tmpdir(), "coral.db");
  if (!fs.existsSync(tmpPath)) {
    fs.copyFileSync(SOURCE_DB_PATH, tmpPath);
  }
  return tmpPath;
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(resolveDbPath());
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}
