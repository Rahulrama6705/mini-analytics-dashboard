// Seeds a real Stripe TEST MODE sandbox with Customers + Subscriptions
// attached to Test Clocks, keyed to real learner_id values from preprod
// (read-only Supabase lookup — no names/emails pulled). Each clock is
// advanced through several weekly billing cycles so customers end up with
// real, Stripe-generated invoice history instantly instead of waiting for
// real time to pass.
//
// Stripe caps each test clock at 3 customers, so learners are grouped into
// batches of 3, each batch getting its own clock.
//
// Writes the learner_id -> {customerId, subscriptionId} mapping to
// data/stripe-mapping.json (gitignored — never touches Supabase). The file
// is updated incrementally after every clock group finishes, so progress
// isn't lost if the script is interrupted partway through a full-database
// run, and the app can start showing real data before the run finishes.
//
// Re-run any time with `npm run stripe:seed-customers`. Safe to re-run —
// it creates fresh test clocks/customers each time (old ones are just
// orphaned test data in the Stripe test dashboard; delete them there if
// you want to clean up) and overwrites the mapping file from scratch.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY in .env.local");
  process.exit(1);
}
if (!STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("STRIPE_SECRET_KEY must be a test-mode key (sk_test_...) — refusing to run against live mode.");
  process.exit(1);
}

const CONFIG_PATH = path.join(process.cwd(), "data", "stripe-config.json");
const MAPPING_PATH = path.join(process.cwd(), "data", "stripe-mapping.json");
const CUSTOMERS_PER_CLOCK = 3;
const WEEKS_OF_HISTORY = 2;
const CLOCK_CONCURRENCY = 15;

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260724);
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

async function waitForClockReady(stripe: Stripe, clockId: string) {
  for (let i = 0; i < 90; i++) {
    const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (clock.status === "ready") return;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`Test clock ${clockId} never became ready`);
}

async function mapWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<void>) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

type PlanKey = "coral_unlimited" | "coral_normal";
type TargetStatus = "active" | "paused" | "canceled";

interface MappingEntry {
  customerId: string;
  subscriptionId: string;
  plan: PlanKey;
}

async function main() {
  const stripe = new Stripe(STRIPE_SECRET_KEY!, { maxNetworkRetries: 5 });

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("Missing data/stripe-config.json — run `npm run stripe:setup-products` first.");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  const planPriceIds: Record<PlanKey, string> = {
    coral_unlimited: config.plans.coral_unlimited.priceId,
    coral_normal: config.plans.coral_normal.priceId,
  };

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  // Fetch every learner, paginating past PostgREST's default 1000-row cap.
  const allLearners: { learner_id: string }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("Learners")
      .select("learner_id")
      .eq("is_deleted", false)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allLearners.push(...data);
    if (data.length < pageSize) break;
  }
  if (allLearners.length === 0) throw new Error("No learners found");

  const learners = shuffle(allLearners);
  const planKeys: PlanKey[] = learners.map((_, i) => (i % 2 === 0 ? "coral_unlimited" : "coral_normal"));
  const targetStatuses: TargetStatus[] = learners.map(() =>
    weightedPick([
      { value: "active" as const, weight: 65 },
      { value: "paused" as const, weight: 15 },
      { value: "canceled" as const, weight: 20 },
    ])
  );
  // Real payment-method variety so invoices actually fail/stay unpaid for
  // some customers instead of every single charge succeeding. "no_card"
  // customers get no default payment method at all, so their invoices sit
  // open/unpaid — the closest real Stripe analog to "pending".
  const paymentProfiles: ("good" | "declining" | "no_card")[] = learners.map(() =>
    weightedPick([
      { value: "good" as const, weight: 75 },
      { value: "declining" as const, weight: 15 },
      { value: "no_card" as const, weight: 10 },
    ])
  );
  const groups = chunk(learners, CUSTOMERS_PER_CLOCK);
  console.log(`Seeding Stripe test data for ${learners.length} learners across ${groups.length} test clocks...`);

  const startTime = Math.floor(Date.now() / 1000);
  const mappingLearners: Record<string, MappingEntry> = {};
  const clockIds: string[] = [];
  let completedGroups = 0;

  function saveProgress() {
    fs.writeFileSync(
      MAPPING_PATH,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalLearners: learners.length,
          completedGroups,
          totalGroups: groups.length,
          testClockIds: clockIds,
          learners: mappingLearners,
        },
        null,
        2
      )
    );
  }

  let failedGroups = 0;

  await mapWithConcurrency(groups, CLOCK_CONCURRENCY, async (group, groupIndex) => {
    try {
      const clock = await stripe.testHelpers.testClocks.create({
        frozen_time: startTime,
        name: `coral-academy seed batch ${groupIndex + 1}`,
      });
      clockIds.push(clock.id);

      const groupResults: {
        learnerId: string;
        subscriptionId: string;
        entry: MappingEntry;
        targetStatus: TargetStatus;
      }[] = [];

      for (let i = 0; i < group.length; i++) {
        const learner = group[i];
        const globalIndex = groupIndex * CUSTOMERS_PER_CLOCK + i;
        const planKey = planKeys[globalIndex];
        const targetStatus = targetStatuses[globalIndex];
        const paymentProfile = paymentProfiles[globalIndex];

        try {
          const customer = await stripe.customers.create({
            test_clock: clock.id,
            metadata: { learner_id: learner.learner_id, app: "coral-academy-dashboard" },
            description: `Coral Academy learner ${learner.learner_id}`,
          });

          if (paymentProfile !== "no_card") {
            const token = paymentProfile === "good" ? "tok_visa" : "tok_chargeDeclined";
            const paymentMethod = await stripe.paymentMethods.create({ type: "card", card: { token } });
            await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
            await stripe.customers.update(customer.id, {
              invoice_settings: { default_payment_method: paymentMethod.id },
            });
          }

          // default_incomplete only for the intentionally-bad-card
          // profiles: without it, a declining/missing card makes
          // subscriptions.create() throw outright. WITH it for a *good*
          // card, Stripe leaves the invoice unconfirmed (no automatic
          // charge attempt) and it silently expires — so "good" customers
          // must use plain automatic-collection creation to actually
          // charge and land on status "active".
          const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: planPriceIds[planKey] }],
            ...(paymentProfile === "good" ? {} : { payment_behavior: "default_incomplete" as const }),
            metadata: { learner_id: learner.learner_id, app: "coral-academy-dashboard" },
          });

          groupResults.push({
            learnerId: learner.learner_id,
            subscriptionId: subscription.id,
            entry: { customerId: customer.id, subscriptionId: subscription.id, plan: planKey },
            targetStatus,
          });
        } catch (err) {
          console.error(
            `  learner ${learner.learner_id} failed, skipping:`,
            err instanceof Error ? err.message : err
          );
        }
      }

      let clockTime = startTime;
      for (let week = 1; week <= WEEKS_OF_HISTORY; week++) {
        clockTime += 7 * 24 * 60 * 60;
        await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: clockTime });
        await waitForClockReady(stripe, clock.id);
      }

      for (const r of groupResults) {
        try {
          if (r.targetStatus === "paused") {
            await stripe.subscriptions.update(r.subscriptionId, {
              pause_collection: { behavior: "mark_uncollectible" },
            });
          } else if (r.targetStatus === "canceled") {
            await stripe.subscriptions.cancel(r.subscriptionId);
          }
        } catch (err) {
          console.error(
            `  status update for learner ${r.learnerId} failed:`,
            err instanceof Error ? err.message : err
          );
        }
        mappingLearners[r.learnerId] = r.entry;
      }

      completedGroups++;
      saveProgress();
      console.log(`Clock ${completedGroups}/${groups.length} done (${clock.id})`);
    } catch (err) {
      failedGroups++;
      console.error(`Group ${groupIndex + 1} failed, skipping:`, err instanceof Error ? err.message : err);
    }
  });

  if (failedGroups > 0) {
    console.log(`\n${failedGroups} group(s) failed and were skipped — re-run the script to retry the rest.`);
  }

  console.log(`\nDone. ${Object.keys(mappingLearners).length} learners seeded across ${clockIds.length} clocks.`);
  console.log(`Written to ${MAPPING_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
