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

## 🔔 Slack Integration Setup

Gumboard can send notifications to Slack when notes and checklist items are created, updated, or completed. Follow these steps to set up Slack integration:

### 1. Create a Slack App

1. Visit [Slack API Apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Enter:
   - **App Name**: Gumboard Notifications (or your preferred name)
   - **Pick a workspace**: Select your workspace
4. Click **Create App**

### 2. Configure Incoming Webhooks

1. In your Slack app dashboard, go to **Features** → **Incoming Webhooks**
2. Turn on **Activate Incoming Webhooks**
3. Click **Add New Webhook to Workspace**
4. Select the channel where you want notifications (e.g., `#general`, `#team-updates`)
5. Click **Allow**
6. Copy the webhook URL (it looks like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`)

### 3. Add Webhook URL to Gumboard

#### For Development:
Add the webhook URL to your `.env.local` file:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

#### For Production/Organization Setup:
1. Log in to your Gumboard instance as an admin
2. Go to **Settings** → **Organization**
3. Scroll to the **Slack Integration** section
4. Paste your webhook URL in the **Slack Webhook URL** field
5. Click **Save**

### 4. Notification Settings

#### Board-Level Control:
- Each board has a **Send Slack Updates** toggle in board settings
- Admins can enable/disable Slack notifications per board
- Test boards (names starting with "Test") automatically skip notifications

#### What Gets Notified:
- ✅ **New notes** with substantial content
- ✅ **Checklist items** added to notes  
- ✅ **Checklist items** marked as completed
- ✅ **Checklist items** reopened (unchecked)
- ✅ **Checklist items** content updated
- ✅ **Notes** archived/completed

#### Smart Deduplication:
- Prevents duplicate messages for the same action within 30 seconds
- Debounces rapid updates from the same user on the same board
- Skips notifications for empty or trivial content

### 5. Message Format

Slack messages include:
- 📝 Emoji indicators (➕ for new items, ✅ for completed)
- 👤 User who performed the action
- 📋 Board name where the action occurred
- 📄 Content of the note/checklist item

Example messages:
```
➕ Checklist item added: "Review pull request #123" by Alice in Project Board
✅ Checklist item completed: "Review pull request #123" by Bob in Project Board  
➕ New note: "Design mockups for landing page" by Charlie in Design Board
```

### 6. Troubleshooting

#### No Messages Appearing:
- Verify the webhook URL is correct and active
- Check that the Slack app has permission to post to the selected channel
- Ensure **Send Slack Updates** is enabled for the board
- Check browser console for error messages

#### Too Many Messages:
- Adjust the board-level **Send Slack Updates** setting
- Consider using a dedicated channel for Gumboard notifications
- The system automatically prevents duplicate messages within 30 seconds

#### Permission Issues:
- Only organization admins can configure the webhook URL
- Regular users can create content that triggers notifications
- Webhook URLs are stored securely and not visible to non-admins

### 7. Advanced Configuration

For custom notification behavior, you can modify:
- `DEBOUNCE_DURATION` in `lib/slack.ts` (default: 1000ms)
- `MESSAGE_DEDUPE_WINDOW` in `lib/slack.ts` (default: 30000ms)
- Message formatting in the `format*ForSlack` functions

### 8. Security Considerations

- Webhook URLs provide write access to your Slack channel
- Store webhook URLs securely and don't commit them to version control
- Consider using environment variables for sensitive configuration
- Regularly rotate webhook URLs if needed
