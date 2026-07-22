import { getDb } from "@/lib/db/client";
import type { CategoryPoint, MonthlyPoint, PaginatedResult, Student, StudentFilters } from "./types";

/** Paginated, filterable student roster for the ops table. */
const SORT_COLUMNS: Record<string, string> = {
  name: "s.name",
  signup_date: "s.signup_date",
  status: "s.status",
};

export function getStudents(filters: StudentFilters = {}): PaginatedResult<Student> {
  const {
    status,
    courseId,
    referralSource,
    from,
    to,
    page = 1,
    pageSize = 20,
    sortBy = "signup_date",
    sortDir = "desc",
  } = filters;

  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (status) {
    where.push("s.status = @status");
    params.status = status;
  }
  if (courseId) {
    where.push("s.course_id = @courseId");
    params.courseId = courseId;
  }
  if (referralSource) {
    where.push("s.referral_source = @referralSource");
    params.referralSource = referralSource;
  }
  if (from) {
    where.push("s.signup_date >= @from");
    params.from = from;
  }
  if (to) {
    where.push("s.signup_date <= @to");
    params.to = to;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const db = getDb();

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM students s ${whereSql}`).get(params) as { c: number }
  ).c;

  const sortColumn = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.signup_date;
  const sortDirSql = sortDir === "asc" ? "ASC" : "DESC";

  const rows = db
    .prepare(
      `SELECT s.id, s.name, s.email, s.signup_date, s.status, s.course_id,
              c.name AS course_name, s.referral_source
       FROM students s
       JOIN courses c ON c.id = s.course_id
       ${whereSql}
       ORDER BY ${sortColumn} ${sortDirSql}
       LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize }) as Student[];

  return { rows, total, page, pageSize };
}

/** Enrollment counts grouped by course for the bar chart. */
export function getEnrollmentsByCourse(): CategoryPoint[] {
  const rows = getDb()
    .prepare(
      `SELECT c.name AS label, COUNT(*) AS value
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       GROUP BY c.id
       ORDER BY value DESC`
    )
    .all() as CategoryPoint[];
  return rows;
}

/** Student signups bucketed by month for the trailing N months. */
export function getSignupsOverTime(months = 12, now: Date = new Date()): MonthlyPoint[] {
  const rows = getDb()
    .prepare(
      `SELECT strftime('%Y-%m', signup_date) AS month, COUNT(*) AS total
       FROM students
       GROUP BY month
       ORDER BY month`
    )
    .all() as { month: string; total: number }[];

  const byMonth = new Map(rows.map((r) => [r.month, r.total]));
  const result: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    result.push({ month: key, value: byMonth.get(key) ?? 0 });
  }
  return result;
}

/**
 * Share of students who started as trial-eligible signups and have since
 * converted to active/completed billing. Mock proxy: active students with
 * at least one succeeded charge, divided by all non-trial students.
 */
export function getTrialToPaidConversionRate(): number {
  const db = getDb();
  const converted = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT s.id) AS c
         FROM students s
         JOIN charges ch ON ch.customer_id = s.id AND ch.status = 'succeeded'
         WHERE s.status != 'trial'`
      )
      .get() as { c: number }
  ).c;
  const eligible = (
    db.prepare(`SELECT COUNT(*) AS c FROM students WHERE status != 'trial'`).get() as { c: number }
  ).c;
  if (eligible === 0) return 0;
  return Number(((converted / eligible) * 100).toFixed(1));
}

export function getCourseOptions(): { id: string; name: string }[] {
  return getDb().prepare(`SELECT id, name FROM courses ORDER BY name`).all() as {
    id: string;
    name: string;
  }[];
}

export function getReferralSourceOptions(): string[] {
  const rows = getDb()
    .prepare(`SELECT DISTINCT referral_source FROM students ORDER BY referral_source`)
    .all() as { referral_source: string }[];
  return rows.map((r) => r.referral_source);
}
