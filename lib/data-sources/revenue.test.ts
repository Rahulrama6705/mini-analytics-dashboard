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

describe("getRevenueByCourse", () => {
  it("sums only succeeded charges, grouped by the student's course", async () => {
    const db = rawDb(dbPath);
    seedCourseAndStudent(db);
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch1', 'student_1', 200, 'usd', 'succeeded', '2026-01-01T00:00:00Z', 'enrollment')`
    ).run();
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch2', 'student_1', 50, 'usd', 'succeeded', '2026-02-01T00:00:00Z', 'installment')`
    ).run();
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch3', 'student_1', 999, 'usd', 'failed', '2026-03-01T00:00:00Z', 'installment')`
    ).run();
    db.close();

    const { getRevenueByCourse } = await import("./revenue");
    expect(getRevenueByCourse()).toEqual([{ label: "Web Dev", value: 250 }]);
  });
});

describe("getFailedPayments", () => {
  it("returns only failed charges, most recent first", async () => {
    const db = rawDb(dbPath);
    seedCourseAndStudent(db);
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch1', 'student_1', 100, 'usd', 'failed', '2026-01-01T00:00:00Z', 'installment')`
    ).run();
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch2', 'student_1', 200, 'usd', 'succeeded', '2026-02-01T00:00:00Z', 'installment')`
    ).run();
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch3', 'student_1', 300, 'usd', 'failed', '2026-03-01T00:00:00Z', 'installment')`
    ).run();
    db.close();

    const { getFailedPayments } = await import("./revenue");
    const result = getFailedPayments();
    expect(result.map((r) => r.id)).toEqual(["ch3", "ch1"]);
  });
});
