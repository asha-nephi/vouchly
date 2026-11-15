# Vouchly

Buy and book from members you can trust. Next.js + TypeScript + Drizzle (Postgres), hosted on Render.

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`
3. Keep `SMS_TEST_MODE=true` so no SMS is sent.
4. Add Resend and Google settings to enable email and Google sign-in.
5. `npm run db:migrate` to create the tables
6. `npm run dev` and open http://localhost:3000

## Sign-in setup

- People log in with Google, or with email and password. Phone codes (SMS) are paused for now: a phone number is asked for at sign-up but not checked. The Twilio code in `src/lib/sms.ts` is kept for when phone checks come back.
- Email/password sign-in uses Resend to send email verification and password reset links. Set `RESEND_API_KEY` and `RESEND_FROM` to a sender on a verified Resend domain.
- Google sign-in needs a Google OAuth client. Add `{SITE_URL}/auth/google/callback` as an allowed redirect URI, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Buyer accounts are open to everyone, and guests can buy from a shared link without an account. Selling needs a member invite and ward confirmation.
- Members can add email/password or connect Google under **Me → Login and security**.
- Log-in, sign-up and password reset are limited per device, so one device can't hammer them.

See `CLAUDE.md` for the full setup notes.

## Database

- Tables live in `src/db/schema.ts`. Money is stored in kobo.
- After changing the schema: `npm run db:generate`, then commit the new file in `drizzle/`.
- Render runs `npm run db:migrate` on every deploy.

## Deploy

`render.yaml` sets up the web service and Postgres in Frankfurt. After pushing, start a deploy in Render and check that it reaches **Live**.
Health check: `/api/health`.
