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

## 💬 Slack Integration Setup

To enable Slack notifications, follow these steps:

### 1. Create a Slack App

1. Go to [Slack API: Your Apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Enter app name (e.g., "Gumboard") and select your workspace
4. Click **Create App**

### 2. Configure OAuth & Permissions

1. In your app dashboard, go to **OAuth & Permissions**
2. Scroll down to **Scopes** → **Bot Token Scopes**
3. Add these scopes:
   - `chat:write` - Send messages to channels
   - `chat:write.public` - Send messages to channels without joining
   - `channels:read` - View basic information about public channels
   - `groups:read` - View basic information about private channels

### 3. Set Redirect URLs

1. Still in **OAuth & Permissions**, scroll to **Redirect URLs**
2. Add your redirect URL:
   ```
   http://localhost:3000/api/slack/oauth/callback
   ```
   *(Replace with your production URL when deploying)*

### 4. Add Environment Variables

In your `.env.local` file, add:

```env
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
# NEXT_PUBLIC_APP_URL=http://localhost:3000  # Optional - see below
```

**Where to find these values:**
- **Client ID**: Found on the **Basic Information** page of your Slack app
- **Client Secret**: Found on the **Basic Information** page of your Slack app

**About NEXT_PUBLIC_APP_URL (Optional):**
- This variable is **optional** and only needed for custom deployments
- **When not set:**
  - Development: automatically uses `http://localhost:3000`  
  - Production: automatically uses `https://gumboard.com`
- **When to set it:** Only if you're deploying to a custom domain or using a different setup
- **For ngrok/custom development:** Set it to your ngrok URL or custom local URL

### 5. Install the App to Your Workspace

1. In **Settings** → **Install App**, click **Install to Workspace**
2. Authorize the app for your workspace
3. In Gumboard, go to **Settings** → **Organization** → **Connect Slack**
4. Complete the OAuth flow to connect your workspace
5. Select a channel for notifications

### 6. Development with ngrok (Optional)

For local development with Slack OAuth, you may need to expose your local server:

```bash
# Install ngrok if you haven't already
npm install -g ngrok

# Expose your local server
ngrok http 3000
```

Then update your Slack app's redirect URL and optionally set `NEXT_PUBLIC_APP_URL` to use the ngrok URL:

```env
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
```

### 7. Invite Bot to Channels

To send notifications to specific channels, invite your Slack bot:

1. Go to the desired Slack channel
2. Type `/invite @YourBotName` (replace with your app name)
3. The channel will now appear in the Gumboard channel picker
