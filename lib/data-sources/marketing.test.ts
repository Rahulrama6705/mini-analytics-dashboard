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

describe("getRetentionCohorts", () => {
  it("computes % active among students who signed up at least N months ago", async () => {
    const db = rawDb(dbPath);
    seedCourse(db);
    const now = new Date("2026-07-22T00:00:00Z");

    // Signed up 8 months ago, still active: counts toward every window.
    db.prepare(
      `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
       VALUES ('s1', 'A', 'a@x.com', '2025-11-22T00:00:00Z', 'active', 'course_1', 'Referral')`
    ).run();

    // Signed up 8 months ago, inactive: in the cohort but not counted active.
    db.prepare(
      `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
       VALUES ('s2', 'B', 'b@x.com', '2025-11-22T00:00:00Z', 'inactive', 'course_1', 'Referral')`
    ).run();

    // Signed up 2 weeks ago: too recent to count in any of the 1/3/6 month cohorts.
    db.prepare(
      `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
       VALUES ('s3', 'C', 'c@x.com', '2026-07-10T00:00:00Z', 'active', 'course_1', 'Referral')`
    ).run();
    db.close();

    const { getRetentionCohorts } = await import("./marketing");
    const cohorts = getRetentionCohorts(now);

    expect(cohorts).toHaveLength(3);
    for (const cohort of cohorts) {
      expect(cohort.cohortSize).toBe(2);
      expect(cohort.retentionRate).toBe(50);
    }
  });

  it("returns 0% with an empty cohort when no students qualify", async () => {
    const { getRetentionCohorts } = await import("./marketing");
    const cohorts = getRetentionCohorts(new Date("2026-07-22T00:00:00Z"));
    expect(cohorts.every((c) => c.cohortSize === 0 && c.retentionRate === 0)).toBe(true);
  });
});

describe("getConversionRateByReferralSource", () => {
  it("computes % of non-trial students per referral source", async () => {
    const db = rawDb(dbPath);
    seedCourse(db);
    const rows: [string, string][] = [
      ["s1", "active"],
      ["s2", "active"],
      ["s3", "trial"],
      ["s4", "trial"],
    ];
    rows.forEach(([id, status]) => {
      db.prepare(
        `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
         VALUES (?, ?, ?, '2025-01-01T00:00:00Z', ?, 'course_1', 'Instagram')`
      ).run(id, id, `${id}@x.com`, status);
    });
    db.close();

    const { getConversionRateByReferralSource } = await import("./marketing");
    const result = getConversionRateByReferralSource();
    expect(result).toEqual([{ label: "Instagram", value: 50 }]);
  });
});
