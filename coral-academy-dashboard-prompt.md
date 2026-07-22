# Prompt for Claude Code: Coral Academy Analytics Dashboard

## Context
Build a small internal analytics tool for Coral Academy. Ops, marketing, and
finance need self-serve visibility into enrollment/user data (Supabase) and
payments data (Stripe) without pinging engineering for every number.

Think Retool / Metabase in spirit: clean, dense, functional dashboards with
filters, tables, and charts — not a consumer-facing product. Prioritize
clarity and speed of scanning data over visual flair.

For this first pass, build against **seeded test/mock data** (not live
Supabase/Stripe connections) so the UI and data layer can be validated before
wiring up real credentials.

## Tech stack
- Next.js (TypeScript, App Router)
- Tailwind CSS + shadcn/ui for components
- Recharts (or similar) for charts
- Vitest for tests
- npm as package manager
- Deploy target: Vercel (do NOT run any deploy or git push commands — I push manually)

## Data model (mock/seed data)
Create realistic seed data that mimics what would come from:

**Supabase (students/users/enrollment):**
- `students`: id, name, email, signup_date, status (active/inactive/trial), course_id, referral_source
- `courses`: id, name, category, price, created_at
- `enrollments`: id, student_id, course_id, enrolled_at, status (active/completed/cancelled)

**Stripe (payments):**
- `charges`: id, customer_id, amount, currency, status (succeeded/failed/refunded), created_at, description
- `subscriptions`: id, customer_id, plan, status (active/canceled/past_due), current_period_end, mrr_amount
- `refunds`: id, charge_id, amount, reason, created_at

Seed ~6-12 months of realistic, randomized data (a few hundred rows per table)
so charts have real trends to show, not flat/empty lines. Put seed generation
in a script (`scripts/seed.ts` or similar) that creates and populates the
local SQLite DB, and is easy to re-run (e.g. drop + recreate tables) as the
schema evolves.

## Data layer architecture (important — build for a real swap-in later)
- Use **local SQLite** (via `better-sqlite3`) as the mock data store, not flat
  JSON files. Reasoning: the real sources (Supabase/Postgres, Stripe) are
  relational and queryable, and the dashboards need filters, date ranges,
  and aggregations (group-by, joins, date bucketing). Writing real SQL
  against SQLite now surfaces the same query logic — WHERE clauses,
  GROUP BY, aggregates — that the real Supabase queries will need, instead
  of masking it behind in-memory JS array filtering.
- Create an abstraction layer (e.g. `lib/data-sources/`) with typed functions
  like `getMRR()`, `getActiveStudents()`, `getChurnRate()`, `getRevenueByMonth()`
  that currently query the local SQLite DB.
- Structure this layer so swapping mock functions for real Supabase client
  calls and Stripe API calls later is a small, contained change — the
  function signatures (accepts filters, returns aggregated rows) should stay
  the same; only the query engine underneath changes. Note clearly in code
  comments where the real API calls would go.

## Dashboards to build
1. **Overview / Home**
   - KPI cards: Total students, Active students, MRR, Revenue this month, Churn rate
   - Revenue trend chart (last 12 months)
   - New enrollments trend chart (last 12 months)

2. **Enrollment dashboard (ops)**
   - Table of students with filters (status, course, date range, referral source)
   - Enrollments by course (bar chart)
   - Signups over time (line chart)
   - Trial-to-paid conversion rate

3. **Revenue dashboard (finance)**
   - MRR trend
   - Revenue by course/plan (bar or pie)
   - Failed payments / refunds table
   - Churned subscriptions list

4. **Marketing dashboard**
   - Signups by referral source (bar chart)
   - Conversion rate by referral source
   - Cohort-style retention view (simple version is fine: % active after 1/3/6 months)

## UX/design requirements
- Left sidebar nav between dashboards, like Retool/Metabase
- Consistent KPI card component, consistent chart card component (title + optional filter + chart)
- Global date-range filter where relevant
- Tables: sortable columns, basic pagination, CSV export button (can be a stub/TODO if out of scope for v1)
- Responsive down to laptop width is enough — this is an internal tool, no need for mobile-first
- Loading and empty states for every chart/table (even though data is seeded, build it as if data could be async/slow)

## Deliverables
- Working Next.js app, runnable with `npm install && npm run dev`
- Seed script documented in README
- README explaining: how to run, where the local SQLite DB and seed script
  live, and exactly which files to touch to wire in real Supabase/Stripe
  credentials later
- Basic Vitest tests for the data-layer functions (e.g. MRR calculation, churn calculation)

## Constraints
- Do not run `git push`, `vercel deploy`, or any other deploy/publish command — I'll handle that manually
- Do not commit any real API keys or secrets — use `.env.example` with placeholder names for future Supabase/Stripe keys
- Keep components small and composable (KPI card, chart card, data table are reusable across all 4 dashboards)

## Suggested build order
1. Scaffold Next.js + Tailwind + shadcn/ui, set up folder structure
2. Build seed data script + data-layer abstraction functions
3. Build shared components (sidebar nav, KPI card, chart card, data table)
4. Build Overview dashboard first (validates the whole pipeline end-to-end)
5. Build the remaining 3 dashboards
6. Add tests for data-layer calculations
7. Write README

Please work through this in that order, and check in after the Overview
dashboard is working before building the rest, so I can confirm direction
early.
