# Gumboard

Keep on top of your team's to-dos.

## Getting Started

### Prequisities

- Docker Compose
- Node

### Install dependencies

```bash
npm install
```

### Database Setup

1. Create your environment variables file:
```bash
cp env.example .env.local
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
