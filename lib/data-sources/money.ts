/** Every Stripe-derived amount in this schema (Invoices, CoursePurchases, Batches.pricing) is in cents. */
export function centsToDollars(cents: number): number {
  return Math.round((cents / 100) * 100) / 100;
}
