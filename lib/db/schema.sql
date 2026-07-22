-- Mock data store schema.
-- Mirrors the shape of the real Supabase (students/courses/enrollments)
-- and Stripe (charges/subscriptions/refunds) sources so query logic here
-- (WHERE, GROUP BY, JOIN, date bucketing) transfers directly when those
-- functions are swapped for real Supabase/Stripe calls later.

DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS charges;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS courses;

-- Supabase-style tables ------------------------------------------------

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  signup_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'trial')),
  course_id TEXT NOT NULL REFERENCES courses(id),
  referral_source TEXT NOT NULL
);

CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  enrolled_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Stripe-style tables ----------------------------------------------------

CREATE TABLE charges (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES students(id),
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded')),
  created_at TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES students(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end TEXT NOT NULL,
  mrr_amount REAL NOT NULL
);

CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  charge_id TEXT NOT NULL REFERENCES charges(id),
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_course ON students(course_id);
CREATE INDEX idx_students_signup_date ON students(signup_date);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_enrolled_at ON enrollments(enrolled_at);
CREATE INDEX idx_charges_customer ON charges(customer_id);
CREATE INDEX idx_charges_created_at ON charges(created_at);
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_refunds_charge ON refunds(charge_id);
