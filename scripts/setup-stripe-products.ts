// One-time (idempotent) setup: creates the two Coral Academy plans as real
// Stripe TEST MODE Products/Prices, and saves their IDs locally so the
// seed/sync scripts and the app can reference them. Safe to re-run — it
// reuses existing products/prices if data/stripe-config.json already has
// them.
import fs from "node:fs";
import path from "node:path";
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

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY in .env.local");
  process.exit(1);
}
if (!STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("STRIPE_SECRET_KEY must be a test-mode key (sk_test_...) — refusing to run against live mode.");
  process.exit(1);
}

const CONFIG_PATH = path.join(process.cwd(), "data", "stripe-config.json");

interface StripeConfig {
  plans: {
    coral_unlimited: { productId: string; priceId: string };
    coral_normal: { productId: string; priceId: string };
  };
}

async function ensurePlan(
  stripe: Stripe,
  name: string,
  weeklyPriceCents: number
): Promise<{ productId: string; priceId: string }> {
  const products = await stripe.products.search({ query: `name:'${name}'` });
  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({ name, metadata: { app: "coral-academy-dashboard" } });
    console.log(`Created product: ${name} (${product.id})`);
  } else {
    console.log(`Reusing product: ${name} (${product.id})`);
  }

  const prices = await stripe.prices.list({ product: product.id, active: true });
  let price = prices.data.find(
    (p) => p.unit_amount === weeklyPriceCents && p.recurring?.interval === "week"
  );
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: weeklyPriceCents,
      currency: "usd",
      recurring: { interval: "week" },
    });
    console.log(`Created price: $${weeklyPriceCents / 100}/week (${price.id})`);
  } else {
    console.log(`Reusing price: $${weeklyPriceCents / 100}/week (${price.id})`);
  }

  return { productId: product.id, priceId: price.id };
}

async function main() {
  const stripe = new Stripe(STRIPE_SECRET_KEY!);

  const coralUnlimited = await ensurePlan(stripe, "Coral Unlimited", 4000);
  const coralNormal = await ensurePlan(stripe, "Coral Normal", 2000);

  const config: StripeConfig = {
    plans: {
      coral_unlimited: coralUnlimited,
      coral_normal: coralNormal,
    },
  };

  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`\nWritten to ${CONFIG_PATH}`);
}

main();
