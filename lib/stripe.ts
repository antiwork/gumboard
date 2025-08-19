import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
  // Use the version bundled with the SDK to avoid TS mismatch errors
  apiVersion: undefined,
});


