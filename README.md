# Gumboard

Keep on top of your team's to-dos.

## Getting Started

### Prequisities

- Docker Compose
- Node

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

## Database Commands

- `npm run docker:up` - Start PostgreSQL database
- `npm run docker:down` - Stop PostgreSQL database
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:reset` - Reset database and run migrations


## 🚀 Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/antiwork/gumboard&env=AUTH_SECRET,AUTH_RESEND_KEY,DATABASE_URL)

Click the button above to deploy your own instance of Gumboard on Vercel in seconds.

### 🔐 Environment Variables

Make sure to set the following environment variables during deployment:

```env
AUTH_SECRET=sample-auth-secret
AUTH_RESEND_KEY=re_sample_key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gumboard
