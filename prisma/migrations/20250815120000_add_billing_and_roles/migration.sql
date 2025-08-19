-- Add enums for roles and billing
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('OWNER','ADMIN','MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE','TEAM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add role to users (default MEMBER)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'MEMBER';

-- Add billing fields to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "plan" "Plan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus";
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);

-- Uniques and index
DO $$ BEGIN
  ALTER TABLE "organizations" ADD CONSTRAINT organizations_stripeCustomerId_key UNIQUE ("stripeCustomerId");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "organizations" ADD CONSTRAINT organizations_stripeSubscriptionId_key UNIQUE ("stripeSubscriptionId");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS organizations_currentPeriodEnd_idx ON "organizations"("currentPeriodEnd");

-- Idempotency store for Stripe events
CREATE TABLE IF NOT EXISTS "StripeEvent" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);


