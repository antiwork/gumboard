// lib/env.ts
import "server-only";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // Core
    DATABASE_URL: z.string(),
    EMAIL_FROM: z.string(),
    AUTH_RESEND_KEY: z.string(),
    AUTH_SECRET: z.string(),
    AUTH_URL: z.string().optional(), // useful locally / NextAuth

    // OAuth (optional)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),

    // Stripe toggle (off by default so CI doesn’t need keys)
    NEXT_PUBLIC_ENABLE_STRIPE: z.enum(["0", "1"]).default("0"),
    STRIPE_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_TEAM_PRO_MONTHLY: z.string().optional(),
    STRIPE_LOOKUP_KEY: z.string().optional(),

    // App limits
    FREE_INVITES_LIMIT: z.coerce.number().default(2),
    PRO_INVITES_LIMIT: z.coerce.number().default(10),
  })
  .superRefine((v, ctx) => {
    if (v.NEXT_PUBLIC_ENABLE_STRIPE === "1") {
      if (!v.STRIPE_SECRET_KEY)
        ctx.addIssue({ code: "custom", path: ["STRIPE_SECRET_KEY"], message: "Required when Stripe is enabled" });
      if (!v.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
        ctx.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
          message: "Required when Stripe is enabled",
        });
      if (!v.STRIPE_WEBHOOK_SECRET)
        ctx.addIssue({ code: "custom", path: ["STRIPE_WEBHOOK_SECRET"], message: "Required when Stripe is enabled" });
    }
  });

export const env = schema.parse(process.env);