import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string(),

  // Emails
  EMAIL_FROM: z.string(),
  AUTH_RESEND_KEY: z.string(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // NextAuth
  AUTH_URL: z.string().optional(),
  AUTH_SECRET: z.string(),

  // ── Stripe ───────────────────────────────────────────────
  // Server SDK secret (required)
  STRIPE_SECRET_KEY: z.string(),
  // Client publishable key for Stripe.js (required)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
  // If you pass a fixed price id to Checkout, keep this;
  // if you use `price_data` instead, it can stay empty.
  STRIPE_PRICE_TEAM_PRO_MONTHLY: z.string().optional(),
  // Present when using Stripe CLI or a dashboard webhook endpoint.
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Optional: if you resolve prices by lookup_key
  STRIPE_LOOKUP_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
