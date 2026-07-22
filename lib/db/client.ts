import Database from "better-sqlite3";
import path from "node:path";

// Local SQLite standing in for Supabase (Postgres) + Stripe. When wiring up
// the real sources: replace this module's usage inside lib/data-sources/*
// with a Supabase client for students/courses/enrollments and the Stripe
// SDK for charges/subscriptions/refunds. Keep the exported function
// signatures in lib/data-sources/ unchanged so callers don't need to change.
// Overridable so tests can point at an isolated fixture database instead
// of the real seeded one.
const DB_PATH = process.env.DASHBOARD_DB_PATH ?? path.join(process.cwd(), "data", "coral.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}
