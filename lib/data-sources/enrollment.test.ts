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

function seedCourse(db: ReturnType<typeof rawDb>) {
  db.prepare(
    `INSERT INTO courses (id, name, category, price, created_at) VALUES ('course_1', 'Web Dev', 'Engineering', 200, '2025-01-01T00:00:00Z')`
  ).run();
}

describe("getTrialToPaidConversionRate", () => {
  it("counts only non-trial students with a succeeded charge as converted", async () => {
    const db = rawDb(dbPath);
    seedCourse(db);

    // Active student with a succeeded charge: converted.
    db.prepare(
      `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
       VALUES ('s1', 'A', 'a@x.com', '2025-01-01T00:00:00Z', 'active', 'course_1', 'Referral')`
    ).run();
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch1', 's1', 200, 'usd', 'succeeded', '2025-01-02T00:00:00Z', 'enrollment')`
    ).run();

    // Inactive student with only a failed charge: not converted.
    db.prepare(
      `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
       VALUES ('s2', 'B', 'b@x.com', '2025-01-01T00:00:00Z', 'inactive', 'course_1', 'Referral')`
    ).run();
    db.prepare(
      `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
       VALUES ('ch2', 's2', 200, 'usd', 'failed', '2025-01-02T00:00:00Z', 'enrollment')`
    ).run();

    // Trial student: excluded from the eligible denominator entirely.
    db.prepare(
      `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
       VALUES ('s3', 'C', 'c@x.com', '2025-01-01T00:00:00Z', 'trial', 'course_1', 'Referral')`
    ).run();
    db.close();

    const { getTrialToPaidConversionRate } = await import("./enrollment");
    // 1 converted out of 2 eligible (non-trial) students = 50%
    expect(getTrialToPaidConversionRate()).toBe(50);
  });

  it("returns 0 when there are no non-trial students", async () => {
    const { getTrialToPaidConversionRate } = await import("./enrollment");
    expect(getTrialToPaidConversionRate()).toBe(0);
  });
});

describe("getStudents", () => {
  it("filters by status and paginates", async () => {
    const db = rawDb(dbPath);
    seedCourse(db);
    for (let i = 0; i < 5; i++) {
      db.prepare(
        `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
         VALUES (?, ?, ?, '2025-01-0${(i % 9) + 1}T00:00:00Z', ?, 'course_1', 'Referral')`
      ).run(`s${i}`, `Student ${i}`, `s${i}@x.com`, i < 3 ? "active" : "inactive");
    }
    db.close();

    const { getStudents } = await import("./enrollment");
    const activeResult = getStudents({ status: "active", pageSize: 10 });
    expect(activeResult.total).toBe(3);
    expect(activeResult.rows).toHaveLength(3);
    expect(activeResult.rows.every((r) => r.status === "active")).toBe(true);

    const page1 = getStudents({ pageSize: 2, page: 1 });
    expect(page1.rows).toHaveLength(2);
    expect(page1.total).toBe(5);
  });
});
