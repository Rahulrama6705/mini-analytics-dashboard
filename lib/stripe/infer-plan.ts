import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { StripePlanKey } from "./payments-types";

interface StripeConfig {
  plans: Record<StripePlanKey, { productId: string; priceId: string }>;
}

export function loadStripeConfig(): StripeConfig {
  const configPath = path.join(process.cwd(), "data", "stripe-config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("Missing data/stripe-config.json — run `npm run stripe:setup-products` first.");
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

export function inferPlanKeyFromPriceId(priceId: string | undefined, config: StripeConfig): StripePlanKey | null {
  const entry = (Object.entries(config.plans) as [StripePlanKey, { priceId: string }][]).find(
    ([, p]) => p.priceId === priceId
  );
  return entry?.[0] ?? null;
}
