# Gumboard

Keep on top of your team's to-dos.

## Getting Started

### Prerequisites

- Docker Compose
- Node

### Install dependencies

```bash
npm install
```

### Database Setup

1. Create your environment variables file:

```bash
cp .env.example .env
```

2. Start the PostgreSQL database using Docker:

```bash
npm run docker:up
```

3. Push the database schema:

```bash
npm run db:push
```

### Development Server

First, run the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser to access the application.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/antiwork/gumboard&env=DATABASE_URL,EMAIL_FROM,AUTH_RESEND_KEY,AUTH_SECRET)

## Database Commands

- `npm run docker:up` - Start PostgreSQL database
- `npm run docker:down` - Stop PostgreSQL database
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:reset` - Reset database and run migrations

### Schema Changes

When changing the database schema in `prisma/schema.prisma`, create and check in a new migration to apply the changes in production:

```bash
npm run db:migrate
```

## 🔐 Google OAuth Setup

To enable login with Google, follow these steps:

### 1. Create Google OAuth Credentials

1. Visit [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to:  
   `APIs & Services` → `Credentials` → `Create Credentials` → `OAuth Client ID`
3. Choose **Web Application** as the application type.
4. Add this to **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   *(Replace with your production URL if deploying)*

### 2. Add Environment Variables

In your `.env.local` file, add:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## 🔐 GitHub OAuth Setup

To enable login with GitHub, follow these steps:

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in the application details:
   - **Application name**: Gumboard (or your preferred name)
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Copy the **Client ID** and **Client Secret**

### 2. Add Environment Variables

In your `.env.local` file, add:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

---

## 💳 Stripe Billing Setup

Stripe integration is **optional** and off by default. Enable it only if you want billing features.

### 1. Environment Variables

Add the following to your `.env.local` (values from your Stripe Dashboard or CLI):

```env
# Feature flag
NEXT_PUBLIC_ENABLE_STRIPE=0

# Stripe keys (required only when flag = 1)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_LOOKUP_KEY=team_pro_monthly   # optional, for plan lookup
```

- Keep `NEXT_PUBLIC_ENABLE_STRIPE=0` for local dev/CI.  
- Set it to `1` only when you want to test billing.

### 2. Database

Stripe fields are already in the Prisma schema. Make sure migrations are applied:

```bash
npm run db:migrate
```

### 3. Local Development with Stripe

1. Start the app with billing enabled:
   ```bash
   NEXT_PUBLIC_ENABLE_STRIPE=1 npm run dev
   ```
2. In another terminal, run the Stripe CLI to forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```
   Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.

3. Go to **Settings → Billing** in the app and click **Upgrade** to open Stripe Checkout.

### 4. Production Setup

1. Create a **Webhook endpoint** in your Stripe Dashboard:
   ```
   https://<your-domain>/api/billing/webhook
   ```
   Set its signing secret as `STRIPE_WEBHOOK_SECRET`.

2. Add all Stripe env vars to your production environment.  
3. Deploy, then verify the upgrade flow and subscription sync.

### 5. Testing & CI

- **Unit tests** use a lazy Stripe loader, so they don’t need real keys.  
- **CI** runs with:
  ```env
  NEXT_PUBLIC_ENABLE_STRIPE=0
  ```
- Stripe E2E tests are not required by default.
