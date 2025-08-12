import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
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
  AUTH_URL: z.string(),
  AUTH_SECRET: z.string(),
});

export const env = schema.parse(process.env);
