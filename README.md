# Gumboard

Keep on top of your team's to-dos.

## Getting Started

### Prerequisites

- Docker Compose
- Node

### Environment Setup

1. Create your environment variables file:
```bash
cp env.example .env.local
```

2. Configure the required environment variables in `.env.local`:

#### Core Configuration
- `AUTH_SECRET`: A random secret for NextAuth.js session encryption. Generate one using:
  ```bash
  openssl rand -base64 32
  ```
- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:5432/gumboard`)

#### Email Authentication (Resend)
- `AUTH_RESEND_KEY`: Your Resend API key (get it from [Resend Dashboard](https://resend.com/api-keys))
- `EMAIL_FROM`: The email address to send authentication emails from (e.g., `noreply@yourdomain.com`)

#### Google OAuth Authentication
To enable Google authentication, you need to set up OAuth 2.0 credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add authorized redirect URIs:
     - For local development: `http://localhost:3000/api/auth/callback/google`
     - For production: `https://yourdomain.com/api/auth/callback/google`
5. Copy the credentials to your `.env.local`:
   - `GOOGLE_CLIENT_ID`: Your OAuth 2.0 Client ID
   - `GOOGLE_CLIENT_SECRET`: Your OAuth 2.0 Client Secret

### Database Setup

1. Start the PostgreSQL database using Docker:
```bash
npm run docker:up
```

2. Push the database schema:
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
