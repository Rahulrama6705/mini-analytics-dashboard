// Generates realistic mock data for the local SQLite store.
// Re-run any time with `npm run seed` — it drops and recreates all tables
// from lib/db/schema.sql before repopulating them.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "coral.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "db", "schema.sql");

// Mulberry32 PRNG so re-runs produce stable, reviewable data.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260101);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function weightedPick<T>(options: { value: T; weight: number }[]): T {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = rand() * total;
  for (const o of options) {
    r -= o.weight;
    if (r <= 0) return o.value;
  }
  return options[options.length - 1].value;
}

const MONTHS_OF_HISTORY = 12;
const NOW = new Date("2026-07-22T00:00:00Z");
const HISTORY_START = new Date(NOW);
HISTORY_START.setUTCMonth(HISTORY_START.getUTCMonth() - MONTHS_OF_HISTORY);

function randomDateBetween(start: Date, end: Date): Date {
  const t = start.getTime() + rand() * (end.getTime() - start.getTime());
  return new Date(t);
}
function iso(d: Date): string {
  return d.toISOString();
}
function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setUTCDate(nd.getUTCDate() + days);
  return nd;
}
function addMonths(d: Date, months: number): Date {
  const nd = new Date(d);
  nd.setUTCMonth(nd.getUTCMonth() + months);
  return nd;
}

const FIRST_NAMES = [
  "Ava", "Liam", "Noah", "Emma", "Olivia", "Mia", "Elijah", "Sophia", "Lucas",
  "Isabella", "Mason", "Amelia", "Ethan", "Harper", "Logan", "Evelyn", "James",
  "Abigail", "Benjamin", "Ella", "Aiden", "Scarlett", "Jack", "Grace", "Owen",
  "Chloe", "Daniel", "Victoria", "Matthew", "Riley", "Henry", "Aria", "Sebastian",
  "Lily", "Jackson", "Zoey", "Samuel", "Nora", "David", "Hazel", "Carter",
  "Violet", "Wyatt", "Aurora", "Julian", "Savannah", "Luke", "Audrey", "Grayson",
  "Brooklyn",
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
  "Flores",
];

const REFERRAL_SOURCES = [
  "Google Search",
  "Instagram",
  "Facebook Ads",
  "Referral",
  "TikTok",
  "Organic / Direct",
  "Partner School",
] as const;

const COURSES = [
  { name: "Full-Stack Web Development", category: "Engineering", price: 249 },
  { name: "Intro to Python Programming", category: "Engineering", price: 149 },
  { name: "Data Science Foundations", category: "Data", price: 299 },
  { name: "Applied Machine Learning", category: "Data", price: 349 },
  { name: "UX/UI Design Bootcamp", category: "Design", price: 279 },
  { name: "Graphic Design Essentials", category: "Design", price: 129 },
  { name: "Digital Marketing Mastery", category: "Marketing", price: 199 },
  { name: "SEO & Content Strategy", category: "Marketing", price: 159 },
  { name: "Product Management 101", category: "Product", price: 259 },
  { name: "Agile & Scrum Certification", category: "Product", price: 179 },
] as const;

function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = OFF");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));
  db.pragma("foreign_keys = ON");

  // --- Courses ---------------------------------------------------------
  const insertCourse = db.prepare(
    `INSERT INTO courses (id, name, category, price, created_at) VALUES (@id, @name, @category, @price, @created_at)`
  );
  const courseIds: string[] = [];
  const courseTx = db.transaction(() => {
    COURSES.forEach((c, i) => {
      const id = `course_${String(i + 1).padStart(2, "0")}`;
      courseIds.push(id);
      insertCourse.run({
        id,
        name: c.name,
        category: c.category,
        price: c.price,
        created_at: iso(addDays(HISTORY_START, -randInt(30, 400))),
      });
    });
  });
  courseTx();

  const courseById = new Map(
    COURSES.map((c, i) => [`course_${String(i + 1).padStart(2, "0")}`, c])
  );

  // --- Students ----------------------------------------------------------
  const STUDENT_COUNT = 320;
  const insertStudent = db.prepare(
    `INSERT INTO students (id, name, email, signup_date, status, course_id, referral_source)
     VALUES (@id, @name, @email, @signup_date, @status, @course_id, @referral_source)`
  );

  type StudentRow = {
    id: string;
    name: string;
    email: string;
    signup_date: string;
    status: "active" | "inactive" | "trial";
    course_id: string;
    referral_source: string;
    signupDate: Date;
  };
  const students: StudentRow[] = [];

  const studentTx = db.transaction(() => {
    for (let i = 0; i < STUDENT_COUNT; i++) {
      const id = `student_${String(i + 1).padStart(4, "0")}`;
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const name = `${first} ${last}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;

      // Skew signups to trend gently upward over the last 12 months.
      const monthOffset = Math.min(
        MONTHS_OF_HISTORY - 1,
        Math.floor(Math.pow(rand(), 0.7) * MONTHS_OF_HISTORY)
      );
      const monthStart = addMonths(HISTORY_START, monthOffset);
      const monthEnd = addMonths(HISTORY_START, monthOffset + 1);
      const signupDate = randomDateBetween(monthStart, monthEnd > NOW ? NOW : monthEnd);

      const daysSinceSignup = Math.floor((NOW.getTime() - signupDate.getTime()) / 86_400_000);
      // Newer signups are more likely to still be trial; older ones settle into active/inactive.
      let status: StudentRow["status"];
      if (daysSinceSignup < 14) {
        status = weightedPick([
          { value: "trial", weight: 70 },
          { value: "active", weight: 25 },
          { value: "inactive", weight: 5 },
        ]);
      } else {
        status = weightedPick([
          { value: "active", weight: 60 },
          { value: "inactive", weight: 30 },
          { value: "trial", weight: 10 },
        ]);
      }

      const course_id = pick(courseIds);
      const referral_source = pick(REFERRAL_SOURCES);

      const row: StudentRow = {
        id,
        name,
        email,
        signup_date: iso(signupDate),
        status,
        course_id,
        referral_source,
        signupDate,
      };
      students.push(row);
      insertStudent.run(row);
    }
  });
  studentTx();

  // --- Enrollments ---------------------------------------------------
  const insertEnrollment = db.prepare(
    `INSERT INTO enrollments (id, student_id, course_id, enrolled_at, status)
     VALUES (@id, @student_id, @course_id, @enrolled_at, @status)`
  );
  let enrollmentSeq = 1;
  const enrollmentTx = db.transaction(() => {
    for (const s of students) {
      const enrolledAt = addDays(s.signupDate, randInt(0, 2));
      let status: "active" | "completed" | "cancelled";
      if (s.status === "active") {
        status = weightedPick([
          { value: "active" as const, weight: 75 },
          { value: "completed" as const, weight: 25 },
        ]);
      } else if (s.status === "trial") {
        status = "active";
      } else {
        status = weightedPick([
          { value: "cancelled" as const, weight: 65 },
          { value: "completed" as const, weight: 35 },
        ]);
      }
      insertEnrollment.run({
        id: `enr_${String(enrollmentSeq++).padStart(4, "0")}`,
        student_id: s.id,
        course_id: s.course_id,
        enrolled_at: iso(enrolledAt),
        status,
      });

      // A subset of active/completed students take a second course later.
      if (s.status !== "trial" && rand() < 0.18) {
        const secondCourse = pick(courseIds);
        const secondEnrolledAt = addDays(enrolledAt, randInt(30, 200));
        if (secondEnrolledAt <= NOW) {
          insertEnrollment.run({
            id: `enr_${String(enrollmentSeq++).padStart(4, "0")}`,
            student_id: s.id,
            course_id: secondCourse,
            enrolled_at: iso(secondEnrolledAt),
            status: weightedPick([
              { value: "active" as const, weight: 60 },
              { value: "completed" as const, weight: 30 },
              { value: "cancelled" as const, weight: 10 },
            ]),
          });
        }
      }
    }
  });
  enrollmentTx();

  // --- Charges, Subscriptions, Refunds --------------------------------
  const insertCharge = db.prepare(
    `INSERT INTO charges (id, customer_id, amount, currency, status, created_at, description)
     VALUES (@id, @customer_id, @amount, @currency, @status, @created_at, @description)`
  );
  const insertSubscription = db.prepare(
    `INSERT INTO subscriptions (id, customer_id, plan, status, current_period_end, mrr_amount)
     VALUES (@id, @customer_id, @plan, @status, @current_period_end, @mrr_amount)`
  );
  const insertRefund = db.prepare(
    `INSERT INTO refunds (id, charge_id, amount, reason, created_at) VALUES (@id, @charge_id, @amount, @reason, @created_at)`
  );

  const REFUND_REASONS = ["requested_by_customer", "duplicate", "fraudulent", "course_cancelled"];
  let chargeSeq = 1;
  let subSeq = 1;
  let refundSeq = 1;

  const billingTx = db.transaction(() => {
    for (const s of students) {
      const course = courseById.get(s.course_id)!;
      const monthlyAmount = Number((course.price / 4).toFixed(2)); // simple installment-style MRR

      // Trial students: no charges yet, no subscription.
      if (s.status === "trial") continue;

      // First charge: the course purchase itself.
      const firstChargeDate = addDays(s.signupDate, randInt(0, 3));
      const firstChargeStatus = weightedPick([
        { value: "succeeded" as const, weight: 90 },
        { value: "failed" as const, weight: 7 },
        { value: "refunded" as const, weight: 3 },
      ]);
      const firstChargeId = `ch_${String(chargeSeq++).padStart(5, "0")}`;
      insertCharge.run({
        id: firstChargeId,
        customer_id: s.id,
        amount: course.price,
        currency: "usd",
        status: firstChargeStatus,
        created_at: iso(firstChargeDate),
        description: `${course.name} - enrollment`,
      });
      if (firstChargeStatus === "refunded") {
        insertRefund.run({
          id: `re_${String(refundSeq++).padStart(5, "0")}`,
          charge_id: firstChargeId,
          amount: course.price,
          reason: pick(REFUND_REASONS),
          created_at: iso(addDays(firstChargeDate, randInt(1, 14))),
        });
      }

      // Recurring monthly charges for active students while their
      // subscription would still be running.
      const subStatus: "active" | "canceled" | "past_due" =
        s.status === "active"
          ? weightedPick([
              { value: "active" as const, weight: 80 },
              { value: "past_due" as const, weight: 20 },
            ])
          : "canceled";

      let cursor = addMonths(firstChargeDate, 1);
      let monthsBilled = 0;
      while (cursor <= NOW && monthsBilled < MONTHS_OF_HISTORY) {
        // Inactive students stop being billed after their subscription cancels.
        if (s.status === "inactive" && rand() < 0.5 && monthsBilled > 0) break;

        const status = weightedPick([
          { value: "succeeded" as const, weight: 92 },
          { value: "failed" as const, weight: 6 },
          { value: "refunded" as const, weight: 2 },
        ]);
        const chargeId = `ch_${String(chargeSeq++).padStart(5, "0")}`;
        insertCharge.run({
          id: chargeId,
          customer_id: s.id,
          amount: monthlyAmount,
          currency: "usd",
          status,
          created_at: iso(cursor),
          description: `${course.name} - monthly installment`,
        });
        if (status === "refunded") {
          insertRefund.run({
            id: `re_${String(refundSeq++).padStart(5, "0")}`,
            charge_id: chargeId,
            amount: monthlyAmount,
            reason: pick(REFUND_REASONS),
            created_at: iso(addDays(cursor, randInt(1, 10))),
          });
        }
        cursor = addMonths(cursor, 1);
        monthsBilled++;
      }

      insertSubscription.run({
        id: `sub_${String(subSeq++).padStart(4, "0")}`,
        customer_id: s.id,
        plan: `${course.category} - Monthly`,
        status: subStatus,
        current_period_end: iso(addMonths(cursor, 0)),
        mrr_amount: subStatus === "canceled" ? 0 : monthlyAmount,
      });
    }
  });
  billingTx();

  const counts = {
    courses: db.prepare("SELECT COUNT(*) c FROM courses").get() as { c: number },
    students: db.prepare("SELECT COUNT(*) c FROM students").get() as { c: number },
    enrollments: db.prepare("SELECT COUNT(*) c FROM enrollments").get() as { c: number },
    charges: db.prepare("SELECT COUNT(*) c FROM charges").get() as { c: number },
    subscriptions: db.prepare("SELECT COUNT(*) c FROM subscriptions").get() as { c: number },
    refunds: db.prepare("SELECT COUNT(*) c FROM refunds").get() as { c: number },
  };

  console.log("Seed complete:");
  console.log(`  courses:       ${counts.courses.c}`);
  console.log(`  students:      ${counts.students.c}`);
  console.log(`  enrollments:   ${counts.enrollments.c}`);
  console.log(`  charges:       ${counts.charges.c}`);
  console.log(`  subscriptions: ${counts.subscriptions.c}`);
  console.log(`  refunds:       ${counts.refunds.c}`);
  console.log(`DB written to ${DB_PATH}`);

  db.close();
}

main();
