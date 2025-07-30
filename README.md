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
