import { CustomerSearchBar } from "@/components/dashboard/customer-search-bar";
import { CustomerSearchResults } from "@/components/dashboard/customer-search-results";
import { CustomerDetailView } from "@/components/dashboard/customer-detail";
import { CustomerPaymentsView } from "@/components/dashboard/customer-payments";
import { CustomerTabs } from "@/components/dashboard/customer-tabs";
import { searchCustomers, getCustomerDetail } from "@/lib/data-sources";
import { getStripePaymentsForLearner } from "@/lib/stripe/payments";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim();
  const learnerId = sp.learnerId;

  const customer = learnerId ? await getCustomerDetail(learnerId) : null;
  const results = !learnerId && query ? await searchCustomers(query) : [];
  const payments = learnerId ? await getStripePaymentsForLearner(learnerId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Look up a family by name or email to see their courses, subscription status, and billing history in one
          place. Profile is read-only; Payments is live Stripe test mode data you can edit.
        </p>
      </div>

      <CustomerSearchBar />

      {learnerId ? (
        customer && payments ? (
          <CustomerTabs
            profile={<CustomerDetailView customer={customer} />}
            payments={<CustomerPaymentsView learnerId={learnerId} payments={payments} />}
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border text-sm text-muted-foreground">
            Couldn&apos;t find that learner.
          </div>
        )
      ) : query ? (
        <CustomerSearchResults results={results} query={query} />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border text-sm text-muted-foreground">
          Search for a learner or parent to get started.
        </div>
      )}
    </div>
  );
}
