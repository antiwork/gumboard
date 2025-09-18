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
Here’s a **completed version** of your Slack integration setup guide with the missing steps filled in, including OAuth installation, token handling, and usage in your app:



## Slack Integration Setup

### 1. Create Slack OAuth Credentials

1. Visit [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Enter **App Name** and select your workspace
4. Go to **OAuth & Permissions**
5. Under **Bot Token Scopes**, add the following:

   * `chat:write` – send messages as the bot
   * `im:history` – read messages in direct messages the bot is part of
   * `app_mentions:read` – read messages that mention the bot
   * `channels:read` – view basic information about channels
   * `channels:join` – join channels automatically

> [!NOTE]
> Slack requires HTTPS for redirect URLs. For local development, you can use **mkcert** + **local-ssl-proxy**. Alternatives: nginx reverse proxy, VSCode tunnel, or `ngrok`.
> Make sure to also update **GitHub/Google callbacks** and `NEXTAUTH_URL`.

---

### 2. Local Certificates Setup

Install `mkcert` and `local-ssl-proxy`:

```bash
# macOS
brew install mkcert
mkcert -install
# For Linux/Windows, see instructions: 
# https://github.com/FiloSottile/mkcert?tab=readme-ov-file#installation

npm install -g local-ssl-proxy
```

Generate a local certificate:

```bash
mkcert localhost
```

Run HTTPS proxy (example: proxying port 3010 to 3000):

```bash
local-ssl-proxy --source 3010 --target 3000 --cert localhost.pem --key localhost-key.pem
```

---

### 3. Configure Slack Redirect URL

Add this URL in **OAuth & Permissions → Redirect URLs**:

```
https://localhost:3010/api/slack/oauth/callback
```

Update your `.env`:

```env
NEXTAUTH_URL=https://localhost:3010
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=https://localhost:3010/api/slack/oauth/callback
```

---


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
---

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
