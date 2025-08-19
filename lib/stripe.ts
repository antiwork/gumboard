import Stripe from "stripe";

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    // Use process.env directly to avoid importing env during build
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-07-30.basil",
    });
  }
  return stripeInstance;
}

// For backward compatibility with existing code
export { getStripe as stripe };
