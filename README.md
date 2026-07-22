# Coral Academy Analytics Dashboard

Internal analytics tool for ops, marketing, and finance to self-serve
enrollment and revenue numbers — Retool/Metabase in spirit: dense, filterable
dashboards over clean visual flair.

This first pass runs entirely against **seeded, local mock data**. Nothing
here talks to real Supabase or Stripe yet — see
["Wiring in real Supabase/Stripe data"](#wiring-in-real-supabasestripe-data)
below for exactly what to change when that's ready.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS + shadcn/ui · Recharts ·
better-sqlite3 · Vitest

## Running it

```bash
npm install
npm run seed   # generates data/coral.db from lib/db/schema.sql
npm run dev    # http://localhost:3000
```

If you don't run `npm run seed` first, the dashboards will error since
`data/coral.db` won't exist yet.

Other scripts:

```bash
npm run build       # production build
npm run test         # run the data-layer test suite once
npm run test:watch   # watch mode
npm run lint          # eslint
```

## Where things live

| Path | What it is |
|---|---|
| `data/coral.db` | The local SQLite file. Gitignored — it's generated, not committed. |
| `scripts/seed.ts` | Generates ~12 months of randomized-but-realistic students, courses, enrollments, charges, subscriptions, and refunds. Drops and recreates every table each run (safe to re-run anytime, e.g. after editing the schema). Uses a fixed PRNG seed so output is stable across runs. |
| `lib/db/schema.sql` | Table definitions for the mock store. Mirrors the shape of Supabase (`students`, `courses`, `enrollments`) and Stripe (`charges`, `subscriptions`, `refunds`). |
| `lib/db/client.ts` | Opens the SQLite connection (singleton). Path overridable via `DASHBOARD_DB_PATH` env var — used by tests to point at an isolated fixture DB. |
| `lib/data-sources/` | The data-layer abstraction. Typed functions (`getMRR()`, `getChurnRate()`, `getRevenueByMonth()`, `getStudents(filters)`, etc.) that dashboards call. This is the layer to change when swapping in real data sources — see below. |
| `components/dashboard/` | Shared, reusable dashboard components: KPI card, chart card, line/bar chart wrappers, students table, filter bar, CSV export, retention bars. |
| `components/layout/sidebar-nav.tsx` | Left sidebar nav between the four dashboards. |
| `app/`, `app/enrollment/`, `app/revenue/`, `app/marketing/` | The four dashboard routes (Overview, Enrollment, Revenue, Marketing). Each page is a server component that calls `lib/data-sources/` functions directly and reads/writes filter state through URL search params. |

## Dashboards

- **Overview** — KPI cards (total/active students, MRR, revenue this month,
  churn rate), revenue trend, new enrollments trend.
- **Enrollment** (ops) — filterable/sortable/paginated student roster with
  CSV export, enrollments by course, signups over time, trial-to-paid
  conversion.
- **Revenue** (finance) — MRR trend, revenue by course, and tabs for failed
  payments / refunds / churned subscriptions.
- **Marketing** — signups and conversion rate by referral source, a simple
  retention view (% still active after 1/3/6 months).

## Wiring in real Supabase/Stripe data

The data-layer functions in `lib/data-sources/*.ts` are the only place that
needs to change. Each file has a real SQL query today; the function
signatures (filters in, plain rows/aggregates out) are designed to stay the
same when the query engine underneath changes:

1. **`lib/data-sources/overview.ts`, `enrollment.ts`** — student/course/
   enrollment queries. Replace the `getDb().prepare(...)` calls with
   Supabase client queries (`supabase.from('students').select(...)`, using
   Supabase's `.gte()`/`.eq()`/RPC or Postgres functions for the
   aggregations currently done in SQL).
2. **`lib/data-sources/revenue.ts`** — charges/subscriptions/refunds
   queries. Replace with Stripe API calls (`stripe.charges.list()`,
   `stripe.subscriptions.list()`, etc.) or, if Stripe data is mirrored into
   Postgres via webhooks, Supabase queries against those mirrored tables.
3. **`lib/data-sources/marketing.ts`** — built on students/charges, same
   swap as above.
4. **`lib/db/client.ts`** — once nothing imports `getDb()` anymore, this
   file (and `lib/db/schema.sql`, `scripts/seed.ts`, `data/`) can be
   deleted.
5. **Credentials** — copy `.env.example` to `.env.local` and fill in the
   real Supabase/Stripe keys. Nothing currently reads these; they're
   placeholders for step 1–2 above.

Because the data layer already runs real SQL (`WHERE`, `GROUP BY`, `JOIN`,
`strftime` date bucketing) instead of filtering JS arrays in memory, the
query *logic* — not just the shape — should mostly transfer directly.

## Tests

`npm run test` runs Vitest against the data-layer calculation functions
(MRR, churn rate, revenue bucketing, trial-to-paid conversion, retention
cohorts, filtered/sorted student queries, etc). Each test builds its own
tiny isolated SQLite fixture (see `lib/data-sources/test-utils.ts`) rather
than depending on the seeded dev database, so they're deterministic and
don't require running `npm run seed` first.

## Known v1 limitations

- CSV export pulls the currently filtered roster (up to 5,000 rows), not
  the current page only, but does not support arbitrary column selection.
- The global date-range filter is implemented per-page (student roster
  filters, chart trailing windows) rather than one control synced across
  every chart on every dashboard.
- No auth — this is assumed to sit behind existing internal-tool access
  control.
