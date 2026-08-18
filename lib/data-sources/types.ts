// Shared types for the data-source layer, matching the real Coral Academy
// preprod schema (Supabase). Every getter accepts plain filter objects and
// returns plain rows/aggregates so page components don't touch Supabase
// query syntax directly.

export type SubscriptionStatus =
  | "active"
  | "active_payment_failure"
  | "active_waiting_for_payment"
  | "canceled"
  | "canceled_waiting_for_expiration"
  | "never_activated";

export type EnrollmentStatus = "active" | "enrolled" | "waitlisted" | "withdrawn" | "none";
export type PaymentIntentStatus = "succeeded" | "payment_failed";

export interface DateRangeFilter {
  from?: string; // ISO date, inclusive
  to?: string; // ISO date, inclusive
}

export type StudentSortField = "name" | "signupDate";
export type SortDirection = "asc" | "desc";

export interface StudentFilters extends DateRangeFilter {
  hasActiveSubscription?: boolean;
  sortBy?: StudentSortField;
  sortDir?: SortDirection;
  page?: number;
  pageSize?: number;
}

/** A row in the learner roster table (Enrollment dashboard). */
export interface StudentRow {
  learnerId: string;
  name: string;
  email: string | null;
  signupDate: string | null;
  hasActiveSubscription: boolean;
  parentName: string;
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

export interface FailedPayment {
  id: string;
  learnerName: string;
  createdAt: string;
  failureReason: string | null;
}

export interface RefundRow {
  purchaseId: string;
  parentName: string;
  amount: number;
  currency: string;
  refundedAt: string;
  courseName: string;
  source: "course_purchase" | "stripe_refund";
}

export interface TodaysSessionLearner {
  learnerId: string;
  learnerName: string;
}

export interface TodaysSessionRow {
  sessionId: string;
  classId: string;
  classTitle: string;
  classCategory: string;
  teacherName: string;
  startTimestamp: string;
  endTimestamp: string;
  status: "Upcoming" | "Ongoing" | "Completed" | "Canceled";
  learnerCount: number;
  learners: TodaysSessionLearner[];
}

export interface QuickStats {
  todayRevenue: number;
  activeSubscriptions: number;
  learnersEnrolledToday: number;
  failedPaymentsCount: number;
}

export interface RecentActivityItem {
  activityType: "enrollment" | "payment" | "refund";
  occurredAt: string;
  title: string;
  subtitle: string;
  amount: number | null;
}

export interface PopularCourseRow {
  classId: string;
  title: string;
  sessionCount: number;
  enrollmentCount: number;
}

export interface RequestedTeacherRow {
  teacherId: string;
  teacherName: string;
  savesThisWeek: number;
  sessionsTaughtLifetime: number;
  learnersTaughtLifetime: number;
  avgAttendanceRate: number;
}

export interface EngagementRow {
  learnerId: string;
  learnerName: string;
  totalSecondsThisWeek: number;
  sessionsAttendedThisWeek: number;
  coursesCompletedTotal: number;
  lastActiveAt: string | null;
}

export interface AtRiskLearnerRow {
  learnerId: string;
  learnerName: string;
  isTemporarilyInactive: boolean;
  lastActiveAt: string | null;
  daysInactive: number | null;
  activeEnrollmentCount: number;
}

export interface ChurnedSubscriptionRow {
  id: string;
  learnerName: string;
  subscriptionType: string;
  canceledAt: string | null;
  subscribedAt: string | null;
}

export interface RetentionPoint {
  label: string;
  retentionRate: number;
  cohortSize: number;
}

// --- Customer lookup -----------------------------------------------------

export interface CustomerSearchResult {
  learnerId: string;
  learnerName: string;
  parentId: string;
  parentName: string;
  parentEmail: string | null;
  hasSessionHistory: boolean;
  hasPayments: boolean;
  hasCourses: boolean;
}

export interface CustomerCourseRow {
  enrollmentId: string;
  className: string;
  batchId: string;
  enrollmentStatus: string;
  startTimestamp: string | null;
  endTimestamp: string | null;
  pricePerSession: number | null;
  currency: string | null;
}

export interface CustomerSubscriptionRow {
  id: string;
  subscriptionType: string;
  status: SubscriptionStatus;
  subscribedAt: string | null;
  canceledAt: string | null;
  renewalAt: string | null;
  expiryAt: string | null;
  pausedAt: string | null;
  resumedAt: string | null;
  pauseStartDate: string | null;
  pauseEndDate: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  /** Most recent paid invoice amount for this subscription, if any (dollars). */
  lastPaidAmount: number | null;
  currency: string | null;
}

export interface CustomerPurchaseRow {
  purchaseId: string;
  className: string | null;
  amount: number | null;
  currency: string | null;
  status: string;
  purchasedAt: string | null;
  refundedAt: string | null;
  sessionCount: number | null;
}

export interface CustomerInvoiceRow {
  invoiceId: string;
  subscriptionId: string;
  amountPaid: number;
  currency: string;
  status: string;
  billingReason: string | null;
  createdAt: string;
}

export interface SessionHistoryRow {
  sessionId: string;
  classTitle: string;
  startTimestamp: string;
  endTimestamp: string;
  attendanceStatus: "Present" | "Absent" | "No record";
}

export interface CustomerDetail {
  learnerId: string;
  learnerName: string;
  dob: string | null;
  parentId: string;
  parentName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  parentSignupDate: string | null;
  stripeCustomerId: string | null;
  courses: CustomerCourseRow[];
  subscriptions: CustomerSubscriptionRow[];
  purchases: CustomerPurchaseRow[];
  invoices: CustomerInvoiceRow[];
  sessionHistory: SessionHistoryRow[];
}

export interface TeacherOverviewRow {
  teacherId: string;
  teacherName: string;
  sessionsTaught: number;
  learnersTaught: number;
  avgAttendanceRate: number;
  lifetimeEarnings: number;
}

export interface UnderbookedClassRow {
  batchId: string;
  classTitle: string;
  teacherName: string;
  sizeEnrolled: number;
  sizeMax: number;
  fillRate: number;
}

// --- Campaign-attributed enrollments -------------------------------------

export interface CampaignEnrollmentFilters extends DateRangeFilter {
  source?: string;
  page?: number;
  pageSize?: number;
}

/** An enrollment attributed to a lead that signed up through an ad campaign (e.g. Meta Ads). */
export interface CampaignEnrollmentRow {
  enrollmentId: string;
  learnerId: string;
  learnerName: string;
  parentName: string;
  parentEmail: string | null;
  enrollmentStatus: string;
  enrollmentDate: string | null;
  campaignSource: string;
  campaignSignupAt: string | null;
  /** The actual Meta Ads campaign name/key (e.g. "13-02 | ITW | CBO | Lead - Copy"), when known. */
  campaignName: string | null;
  landingVariant: string | null;
}

export interface CampaignLeadFilters extends DateRangeFilter {
  source?: string;
  page?: number;
  pageSize?: number;
}

/** A lead that signed up through an ad campaign but has no enrollment yet (parent never enrolled a learner). */
export interface CampaignLeadRow {
  formSubmissionId: string;
  parentName: string;
  parentEmail: string | null;
  campaignSource: string;
  campaignSignupAt: string | null;
  campaignName: string | null;
  landingVariant: string | null;
}
