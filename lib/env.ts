// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  NEXT_PUBLIC_ENABLE_STRIPE: z.enum(["0", "1"]).default("0"),

  // Stripe keys optional unless flag is ON
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_TEAM_PRO_MONTHLY: z.string().optional(),
  STRIPE_LOOKUP_KEY: z.string().optional(),

  AUTH_SECRET: z.string().min(1),
  AUTH_RESEND_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),

  FREE_INVITES_LIMIT: z.coerce.number().default(2),
  PRO_INVITES_LIMIT: z.coerce.number().default(10),
}).superRefine((v, ctx) => {
  if (v.NEXT_PUBLIC_ENABLE_STRIPE === "1") {
    if (!v.STRIPE_SECRET_KEY)
      ctx.addIssue({ code: "custom", path: ["STRIPE_SECRET_KEY"], message: "Required when billing is enabled" });
    if (!v.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      ctx.addIssue({ code: "custom", path: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"], message: "Required when billing is enabled" });
    if (!v.STRIPE_WEBHOOK_SECRET)
      ctx.addIssue({ code: "custom", path: ["STRIPE_WEBHOOK_SECRET"], message: "Required when billing is enabled" });
  }
});

export const env = envSchema.parse(process.env);
