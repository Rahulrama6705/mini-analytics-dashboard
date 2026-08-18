// Plain types shared between server (lib/stripe/payments.ts) and client
// (subscription-actions-menu.tsx) code — no fs/server-only here so it's
// safe to bundle into the browser.

export interface StripeSubscriptionView {
  id: string;
  status: string;
  isPaused: boolean;
  pauseResumesAt: string | null;
  planName: string;
  weeklyPriceCents: number;
  priceId: string | null;
  startedAt: string;
  canceledAt: string | null;
  currentPeriodEnd: string | null;
}

export interface RefundView {
  status: "pending" | "refunded" | "failed";
  amountCents: number;
  currency: string;
  refundedAt: string | null;
  receiptUrl: string | null;
}

export interface StripeTransactionView {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  description: string;
  paymentIntentId: string | null;
  chargeId: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  refund: RefundView | null;
}

export interface StripePaymentsForLearner {
  customerId: string | null;
  subscription: StripeSubscriptionView | null;
  transactions: StripeTransactionView[];
}

export type StripePlanKey = "coral_unlimited" | "coral_normal";
