# Vouchly

Buy and book from members you can trust. Next.js + TypeScript + Drizzle (Postgres), hosted on Render.

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL`
3. `npm run db:migrate` to create the tables
4. `npm run dev` and open http://localhost:3000

## Database

- Tables live in `src/db/schema.ts`. Money is stored in kobo.
- After changing the schema: `npm run db:generate`, then commit the new file in `drizzle/`.
- Render runs `npm run db:migrate` on every deploy.

## Deploy

`render.yaml` sets up the web service and Postgres in Frankfurt. Pushes to `main` deploy automatically.
Health check: `/api/health`.
