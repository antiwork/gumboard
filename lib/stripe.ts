import Stripe from "stripe";

export function getStripe(): Stripe | null {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_STRIPE === "1";
  const key = process.env.STRIPE_SECRET_KEY;
  if (!enabled || !key) return null;
  return new Stripe(key);
}
