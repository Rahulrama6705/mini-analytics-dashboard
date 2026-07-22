import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setUpFixtureDb, rawDb } from "./test-utils";

let cleanup: () => void;
let dbPath: string;

beforeEach(() => {
  vi.resetModules();
  const fixture = setUpFixtureDb();
  dbPath = fixture.dbPath;
  cleanup = fixture.cleanup;
});

afterEach(() => {
  cleanup();
});

function seedCourseAndStudent(db: ReturnType<typeof rawDb>) {
  db.prepare(
    `INSERT INTO courses (id, name, category, price, created_at) VALUES ('course_1', 'Web Dev', 'Engineering', 200, '2025-01-01T00:00:00Z')`
  ).run();
  db.prepare(
    `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
     VALUES ('student_1', 'Ada Lovelace', 'ada@example.com', '2025-01-01T00:00:00Z', 'active', 'course_1', 'Referral')`
  ).run();
}

describe("getMRR", () => {
  it("sums mrr_amount only for active subscriptions", async () => {
    const db = rawDb(dbPath);
    seedCourseAndStudent(db);
    db.prepare(
      `INSERT INTO subscriptions (id, customer_id, plan, status, current_period_end, mrr_amount)
       VALUES ('sub_1', 'student_1', 'Engineering - Monthly', 'active', '2026-08-01T00:00:00Z', 50)`
    ).run();
    db.prepare(
      `INSERT INTO subscriptions (id, customer_id, plan, status, current_period_end, mrr_amount)
       VALUES ('sub_2', 'student_1', 'Engineering - Monthly', 'canceled', '2026-06-01T00:00:00Z', 0)`
    ).run();
    db.prepare(
      `INSERT INTO subscriptions (id, customer_id, plan, status, current_period_end, mrr_amount)
       VALUES ('sub_3', 'student_1', 'Engineering - Monthly', 'active', '2026-08-01T00:00:00Z', 30)`
    ).run();
    db.close();

    const { getMRR } = await import("./overview");
    expect(getMRR()).toBe(80);
  });

  it("returns 0 when there are no active subscriptions", async () => {
    const db = rawDb(dbPath);
    seedCourseAndStudent(db);
    db.prepare(
      `INSERT INTO subscriptions (id, customer_id, plan, status, current_period_end, mrr_amount)
       VALUES ('sub_1', 'student_1', 'Engineering - Monthly', 'canceled', '2026-06-01T00:00:00Z', 0)`
    ).run();
    db.close();

    const { getMRR } = await import("./overview");
    expect(getMRR()).toBe(0);
  });
});

describe("getChurnRate", () => {
  it("computes canceled / total subscriptions as a percentage", async () => {
    const db = rawDb(dbPath);
    seedCourseAndStudent(db);
    const statuses = ["active", "active", "canceled", "past_due"];
    statuses.forEach((status, i) => {
      db.prepare(
        `INSERT INTO subscriptions (id, customer_id, plan, status, current_period_end, mrr_amount)
         VALUES (?, 'student_1', 'Engineering - Monthly', ?, '2026-08-01T00:00:00Z', 50)`
      ).run(`sub_${i}`, status);
    });
    db.close();

    const { getChurnRate } = await import("./overview");
    // 1 canceled out of 4 total = 25%
    expect(getChurnRate()).toBe(25);
  });

  it("returns 0 when there are no subscriptions at all", async () => {
    const { getChurnRate } = await import("./overview");
    expect(getChurnRate()).toBe(0);
  });
});

describe("getRevenueThisMonth", () => {
  it("sums only succeeded charges within the given month", async () => {
    const db = rawDb(dbPath);
    seedCourseAndStudent(db);
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch_1', 'student_1', 100, 'usd', 'succeeded', '2026-07-05T00:00:00Z', 'enrollment')`
    ).run();
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch_2', 'student_1', 60, 'usd', 'succeeded', '2026-07-20T00:00:00Z', 'installment')`
    ).run();
    // Failed charge in the same month should be excluded.
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch_3', 'student_1', 999, 'usd', 'failed', '2026-07-10T00:00:00Z', 'installment')`
    ).run();
    // Succeeded charge in a different month should be excluded.
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch_4', 'student_1', 500, 'usd', 'succeeded', '2026-06-10T00:00:00Z', 'installment')`
    ).run();
    db.close();

    const { getRevenueThisMonth } = await import("./overview");
    expect(getRevenueThisMonth(new Date("2026-07-22T00:00:00Z"))).toBe(160);
  });
});

describe("getRevenueByMonth", () => {
  it("fills months with no charges as 0 and orders oldest to newest", async () => {
    const db = rawDb(dbPath);
    seedCourseAndStudent(db);
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch_1', 'student_1', 100, 'usd', 'succeeded', '2026-07-05T00:00:00Z', 'enrollment')`
    ).run();
    db.close();

    const { getRevenueByMonth } = await import("./overview");
    const trend = getRevenueByMonth(3, new Date("2026-07-22T00:00:00Z"));
    expect(trend).toEqual([
      { month: "2026-05", value: 0 },
      { month: "2026-06", value: 0 },
      { month: "2026-07", value: 100 },
    ]);
  });
});
