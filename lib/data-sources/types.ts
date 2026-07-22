// Shared types for the data-source layer. Every getter here accepts plain
// filter objects and returns plain rows/aggregates — no SQLite-specific
// types leak out — so callers don't change when the underlying query
// engine is swapped from SQLite to Supabase/Stripe.

export type StudentStatus = "active" | "inactive" | "trial";
export type EnrollmentStatus = "active" | "completed" | "cancelled";
export type ChargeStatus = "succeeded" | "failed" | "refunded";
export type SubscriptionStatus = "active" | "canceled" | "past_due";

export interface DateRangeFilter {
  from?: string; // ISO date, inclusive
  to?: string; // ISO date, inclusive
}

export type StudentSortField = "name" | "signup_date" | "status";
export type SortDirection = "asc" | "desc";

export interface StudentFilters extends DateRangeFilter {
  status?: StudentStatus;
  courseId?: string;
  referralSource?: string;
  page?: number;
  pageSize?: number;
  sortBy?: StudentSortField;
  sortDir?: SortDirection;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  signup_date: string;
  status: StudentStatus;
  course_id: string;
  course_name: string;
  referral_source: string;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MonthlyPoint {
  month: string; // "2026-01"
  value: number;
}

export interface CategoryPoint {
  label: string;
  value: number;
}

export interface Charge {
  id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  currency: string;
  status: ChargeStatus;
  created_at: string;
  description: string;
}

export interface Refund {
  id: string;
  charge_id: string;
  customer_name: string;
  amount: number;
  reason: string;
  created_at: string;
}

export interface ChurnedSubscription {
  id: string;
  customer_name: string;
  plan: string;
  status: SubscriptionStatus;
  current_period_end: string;
  mrr_amount: number;
}
