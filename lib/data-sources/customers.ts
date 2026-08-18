import { getSupabase } from "@/lib/supabase/server-client";
import { getStripeMappingForLearner } from "@/lib/stripe/payments";
import { centsToDollars } from "./money";
import type {
  CustomerCourseRow,
  CustomerDetail,
  CustomerInvoiceRow,
  CustomerPurchaseRow,
  CustomerSearchResult,
  CustomerSubscriptionRow,
  SessionHistoryRow,
} from "./types";

// Learners and Parents don't carry name/email themselves — both extend the
// base `Users` table (learner_id / parent_id = Users.user_id), and email
// lives in Supabase auth (`auth.users`, exposed here via the read-only
// `public.user_emails` view created for this dashboard). So looking up a
// person by name or email always starts by resolving candidate user_ids,
// then walking Learners/Parents from there.

interface UserRow {
  user_id: string;
  name: string | null;
  phone_number: string | null;
}

/** Search learners by their own name/email, or by their parent's name/email. */
export async function searchCustomers(query: string, limit = 20): Promise<CustomerSearchResult[]> {
  const db = getSupabase();
  const term = `%${query}%`;

  const [byName, byEmail] = await Promise.all([
    db.from("Users").select("user_id").ilike("name", term).limit(100),
    db.from("user_emails").select("user_id").ilike("email", term).limit(100),
  ]);
  if (byName.error) throw byName.error;
  if (byEmail.error) throw byEmail.error;

  const candidateIds = Array.from(
    new Set([...(byName.data ?? []), ...(byEmail.data ?? [])].map((r) => r.user_id as string))
  );
  if (candidateIds.length === 0) return [];

  const [learnerHits, parentHits] = await Promise.all([
    db.from("Learners").select("learner_id, parent_id").in("learner_id", candidateIds).eq("is_deleted", false),
    db.from("Learners").select("learner_id, parent_id").in("parent_id", candidateIds).eq("is_deleted", false),
  ]);
  if (learnerHits.error) throw learnerHits.error;
  if (parentHits.error) throw parentHits.error;

  const learners = Array.from(
    new Map(
      [...(learnerHits.data ?? []), ...(parentHits.data ?? [])].map((r) => [r.learner_id as string, r])
    ).values()
  ).slice(0, limit);
  if (learners.length === 0) return [];

  return hydrateSearchResults(learners as { learner_id: string; parent_id: string }[]);
}

async function hydrateSearchResults(
  learners: { learner_id: string; parent_id: string }[]
): Promise<CustomerSearchResult[]> {
  const db = getSupabase();
  const learnerIds = learners.map((l) => l.learner_id);
  const parentIds = Array.from(new Set(learners.map((l) => l.parent_id)));

  const [{ data: users, error: usersErr }, { data: emails, error: emailsErr }, { data: courseRows, error: courseErr }, { data: sessionHistoryIds, error: sessionErr }] =
    await Promise.all([
      db.from("Users").select("user_id, name").in("user_id", [...learnerIds, ...parentIds]),
      db.from("user_emails").select("user_id, email").in("user_id", parentIds),
      db.from("Enrollments").select("learner_id").in("learner_id", learnerIds),
      db.rpc("dashboard_learners_with_session_history", { learner_ids: learnerIds }),
    ]);
  if (usersErr) throw usersErr;
  if (emailsErr) throw emailsErr;
  if (courseErr) throw courseErr;
  if (sessionErr) throw sessionErr;

  const nameById = new Map((users ?? []).map((u) => [u.user_id as string, u.name as string | null]));
  const emailById = new Map((emails ?? []).map((e) => [e.user_id as string, e.email as string | null]));
  const learnersWithCourses = new Set((courseRows ?? []).map((r) => r.learner_id as string));
  const learnersWithSessionHistory = new Set(
    ((sessionHistoryIds ?? []) as { learner_id: string }[]).map((r) => r.learner_id)
  );

  return learners.map((l) => ({
    learnerId: l.learner_id,
    learnerName: nameById.get(l.learner_id) ?? "(unnamed learner)",
    parentId: l.parent_id,
    parentName: nameById.get(l.parent_id) ?? "(unknown parent)",
    parentEmail: emailById.get(l.parent_id) ?? null,
    hasSessionHistory: learnersWithSessionHistory.has(l.learner_id),
    hasPayments: getStripeMappingForLearner(l.learner_id) !== null,
    hasCourses: learnersWithCourses.has(l.learner_id),
  }));
}

export async function getCustomerDetail(learnerId: string): Promise<CustomerDetail | null> {
  const db = getSupabase();

  const { data: learner, error: learnerErr } = await db
    .from("Learners")
    .select("learner_id, parent_id, dob")
    .eq("learner_id", learnerId)
    .single();
  if (learnerErr || !learner) return null;

  const { data: parent, error: parentErr } = await db
    .from("Parents")
    .select("parent_id, customer_id")
    .eq("parent_id", learner.parent_id)
    .single();
  if (parentErr || !parent) return null;

  const [{ data: users }, { data: emails }, enrollments, subscriptions, purchases, invoices, sessionHistory] =
    await Promise.all([
      db
        .from("Users")
        .select("user_id, name, phone_number")
        .in("user_id", [learner.learner_id, parent.parent_id]) as unknown as Promise<{ data: UserRow[] }>,
      db.from("user_emails").select("user_id, email, created_at").in("user_id", [parent.parent_id]),
      getCustomerCourses(learnerId),
      getCustomerSubscriptions(learnerId),
      getCustomerPurchases(parent.parent_id),
      parent.customer_id ? getCustomerInvoices(parent.customer_id) : Promise.resolve([]),
      getLearnerSessionHistory(learnerId),
    ]);

  const usersById = new Map((users ?? []).map((u) => [u.user_id, u]));
  const parentEmailRow = (emails ?? [])[0] as { email: string; created_at: string } | undefined;

  return {
    learnerId: learner.learner_id,
    learnerName: usersById.get(learner.learner_id)?.name ?? "(unnamed learner)",
    dob: learner.dob,
    parentId: parent.parent_id,
    parentName: usersById.get(parent.parent_id)?.name ?? "(unknown parent)",
    parentEmail: parentEmailRow?.email ?? null,
    parentPhone: usersById.get(parent.parent_id)?.phone_number ?? null,
    parentSignupDate: parentEmailRow?.created_at ?? null,
    // Supabase's own Parents.customer_id is unpopulated for the Stripe
    // test-mode seed data (that mapping only lives in
    // data/stripe-mapping.json, deliberately never written to Supabase) —
    // fall back to it so the field isn't blank for every seeded learner.
    stripeCustomerId: parent.customer_id ?? getStripeMappingForLearner(learnerId)?.customerId ?? null,
    courses: enrollments,
    subscriptions,
    purchases,
    invoices,
    sessionHistory,
  };
}

async function getLearnerSessionHistory(learnerId: string): Promise<SessionHistoryRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_learner_session_history", {
    target_learner_id: learnerId,
    result_limit: 200,
  });
  if (error) throw error;
  return (
    data as {
      session_id: string;
      class_title: string | null;
      start_timestamp: string;
      end_timestamp: string;
      attendance_status: SessionHistoryRow["attendanceStatus"];
    }[]
  ).map((r) => ({
    sessionId: r.session_id,
    classTitle: r.class_title ?? "(unknown class)",
    startTimestamp: r.start_timestamp,
    endTimestamp: r.end_timestamp,
    attendanceStatus: r.attendance_status,
  }));
}

async function getCustomerCourses(learnerId: string): Promise<CustomerCourseRow[]> {
  const db = getSupabase();
  const { data: enrollments, error } = await db
    .from("Enrollments")
    .select("enrollment_id, batch_id, enrollment_status, start_timestamp, end_timestamp")
    .eq("learner_id", learnerId)
    .eq("is_latest", true)
    .order("start_timestamp", { ascending: false });
  if (error) throw error;
  if (!enrollments || enrollments.length === 0) return [];

  const batchIds = enrollments.map((e) => e.batch_id).filter(Boolean) as string[];
  const { data: batches, error: batchErr } = await db
    .from("Batches")
    .select("batch_id, class_id, pricing")
    .in("batch_id", batchIds);
  if (batchErr) throw batchErr;

  const classIds = Array.from(new Set((batches ?? []).map((b) => b.class_id).filter(Boolean))) as string[];
  const { data: classes, error: classErr } = await db.from("Classes").select("class_id, title").in("class_id", classIds);
  if (classErr) throw classErr;

  const batchById = new Map((batches ?? []).map((b) => [b.batch_id, b]));
  const classNameById = new Map((classes ?? []).map((c) => [c.class_id, c.title as string]));

  return enrollments.map((e) => {
    const batch = batchById.get(e.batch_id);
    const pricing = batch?.pricing as { regular?: { amount?: number; currency?: string } } | undefined;
    return {
      enrollmentId: e.enrollment_id,
      className: (batch && classNameById.get(batch.class_id)) ?? "(unknown class)",
      batchId: e.batch_id,
      enrollmentStatus: e.enrollment_status ?? "none",
      startTimestamp: e.start_timestamp,
      endTimestamp: e.end_timestamp,
      pricePerSession:
        pricing?.regular?.amount != null ? centsToDollars(pricing.regular.amount) : null,
      currency: pricing?.regular?.currency ?? null,
    };
  });
}

async function getCustomerSubscriptions(learnerId: string): Promise<CustomerSubscriptionRow[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from("Subscriptions")
    .select(
      "id, stripe_subscription_id, subscription_type, subscription_status, subscribed_at, canceled_at, renewal_at, expiry_at, paused_at, resumed_at, pause_start_date, pause_end_date, stripe_product_id, stripe_price_id"
    )
    .eq("learner_id", learnerId)
    .order("subscribed_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Invoices.subscription_id stores the Stripe subscription id
  // (stripe_subscription_id), not Subscriptions.id.
  const stripeSubIds = data.map((s) => s.stripe_subscription_id).filter((id): id is string => Boolean(id));
  const { data: invoices, error: invErr } =
    stripeSubIds.length > 0
      ? await db
          .from("Invoices")
          .select("subscription_id, amount_paid, currency, created_at")
          .in("subscription_id", stripeSubIds)
          .eq("status", "paid")
          .order("created_at", { ascending: false })
      : { data: [], error: null };
  if (invErr) throw invErr;

  const lastInvoiceBySub = new Map<string, { amount_paid: number; currency: string }>();
  for (const inv of invoices ?? []) {
    if (!lastInvoiceBySub.has(inv.subscription_id)) {
      lastInvoiceBySub.set(inv.subscription_id, inv);
    }
  }

  return data.map((s) => {
    const lastInvoice = s.stripe_subscription_id ? lastInvoiceBySub.get(s.stripe_subscription_id) : undefined;
    return {
      id: s.id,
      subscriptionType: s.subscription_type ?? "unknown",
      status: s.subscription_status,
      subscribedAt: s.subscribed_at,
      canceledAt: s.canceled_at,
      renewalAt: s.renewal_at,
      expiryAt: s.expiry_at,
      pausedAt: s.paused_at,
      resumedAt: s.resumed_at,
      pauseStartDate: s.pause_start_date,
      pauseEndDate: s.pause_end_date,
      stripeProductId: s.stripe_product_id,
      stripePriceId: s.stripe_price_id,
      lastPaidAmount: lastInvoice ? centsToDollars(lastInvoice.amount_paid) : null,
      currency: lastInvoice?.currency ?? null,
    };
  });
}

async function getCustomerPurchases(parentId: string): Promise<CustomerPurchaseRow[]> {
  const db = getSupabase();
  const { data: purchases, error } = await db
    .from("CoursePurchases")
    .select("purchase_id, class_id, amount, currency, status, purchased_at, refunded_at, session_count")
    .eq("parent_id", parentId)
    .order("purchased_at", { ascending: false });
  if (error) throw error;
  if (!purchases || purchases.length === 0) return [];

  const classIds = Array.from(new Set(purchases.map((p) => p.class_id).filter(Boolean))) as string[];
  const { data: classes, error: classErr } = await db.from("Classes").select("class_id, title").in("class_id", classIds);
  if (classErr) throw classErr;
  const classNameById = new Map((classes ?? []).map((c) => [c.class_id, c.title as string]));

  return purchases.map((p) => ({
    purchaseId: p.purchase_id,
    className: classNameById.get(p.class_id) ?? null,
    amount: p.amount != null ? centsToDollars(Number(p.amount)) : null,
    currency: p.currency,
    status: p.status,
    purchasedAt: p.purchased_at,
    refundedAt: p.refunded_at,
    sessionCount: p.session_count,
  }));
}

async function getCustomerInvoices(customerId: string): Promise<CustomerInvoiceRow[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from("Invoices")
    .select("invoice_id, subscription_id, amount_paid, currency, status, billing_reason, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? []).map((i) => ({
    invoiceId: i.invoice_id,
    subscriptionId: i.subscription_id,
    amountPaid: centsToDollars(i.amount_paid),
    currency: i.currency,
    status: i.status,
    billingReason: i.billing_reason,
    createdAt: i.created_at,
  }));
}
