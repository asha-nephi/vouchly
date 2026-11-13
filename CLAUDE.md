# Vouchly — handoff notes

Read this first. It's what a new coding session needs to keep building Vouchly without breaking it.

## What Vouchly is

A marketplace for members of The Church of Jesus Christ of Latter-day Saints in Lagos, Nigeria. Think "Selar, but for LDS entrepreneurs". Members sell to each other and to anyone they share a link with, so they can be more self-reliant. Returned missionaries with skills are a key group.

- **Sellers** must be invited and confirmed members. Each gets a shop at `/s/[slug]`.
- **Buyers** can be anyone with a link. They check out as guests (name + phone, email optional). No account needed.
- **What can be sold** (product `kind`):
  - `item`: physical goods, often pre-order
  - `stay`: Airbnb-style nights
  - `service`: fixed price, or "price after a chat" (quote)
  - `digital`: file download
  - `session`: 1-on-1 coaching in time slots
  - `event`: a class or event, with tickets and seat limits
- **Money:** payments go through Paystack using split payments. Vouchly keeps a 5% fee. All money is stored in **kobo** (₦1 = 100 kobo).
- **Owner:** Nephi Asha (asha-nephi on GitHub). The live site is on Render (Frankfurt).

## Rules from the owner (follow these)

- **Plain, simple language everywhere.** This applies to UI text, error messages and anything you say to Nephi. No jargon. Short sentences that still say enough.
- **Code comments:** short one-liners only.
- **Mobile-first and lightweight.** Most users are on mid-range Android phones with slow data. Keep pages small, keep JavaScript on the client to a minimum, and prefer server components and server actions.
- **Design is "Style C":**
  - Manrope font.
  - Colors live in `src/app/globals.css` under `@theme`: ink `#14213D`, accent blue `#2A4BD7`, soft `#DCE4FB`, bg `#F7F8FA`, and so on.
  - Use the existing components in `src/components/` (`ui.tsx`, `form-bits.tsx`, `submit-button.tsx`, etc.) rather than inventing new styles.
- **Brand:** the word "Vouchly" is written as text in the app. The logo is only for the favicon, home-screen icon and share previews.
- **Secrets:** never ask Nephi to paste keys into chat. He puts them in Render → Environment himself.
- **No paid WhatsApp API.** Notifications are in-app (bell) and SMS (Termii). Sharing uses `wa.me` links.
- **Address:** Nephi's home address (57 Seriki Aro Avenue, Ikeja, Lagos 100282) is fine to show publicly, for example on the contact page.

## Stack

- Next.js 15.5 (App Router), React 19 (`useActionState`, server actions), TypeScript, Tailwind v4
- Drizzle ORM with postgres.js, on Postgres
- Paystack (payments and refunds), Termii (SMS / OTP login), Cloudflare R2 (photos and digital files, optional), sharp (share images)
- Login is by phone number + OTP. There are no passwords.

## Where things are

```
src/app/
  page.tsx, join/, login/, verify/, contact/   landing and sign-in pages
  (app)/      member and buying pages (home, search, basket, checkout, book, orders,
              notifications, me, sell, shop/manage/*, admin/*)
  (public)/   s/[slug] (shop page) and p/[id] (listing page): public and shareable
  o/[token]/  private order link for guests (signs them in to that order)
  api/        paystack webhook, cron/settle, download/[code], photos, share-image, health
  actions.ts  sign-up, login, OTP, invites
src/db/schema.ts      all tables and enums
src/lib/              business logic (payments, orders, order-status, sessions, discounts,
                      guest, files, photos, listings, notify, sms, paystack ...)
src/components/       shared UI
drizzle/              SQL migrations 0000–0009 (all applied on live)
```

Key files to understand before changing buying flows:

- `src/lib/payments.ts` → `confirmPayment()`. It runs when Paystack confirms a payment. It checks for double bookings or overselling (and refunds if so), sets the order status, marks discount codes as used, and notifies the seller.
- `src/lib/order-status.ts`: status labels, the timeline steps, and the next action for the seller and buyer for each delivery method.
- `src/lib/guest.ts` → `buyerFor(form)`. It returns the signed-in user, or creates a guest buyer. A member's phone number is refused here, so the member has to log in instead.
- `src/lib/auth.ts`:
  - `currentUser()`: anyone, including guests
  - `currentMember()`: confirmed members only
  - `requireUser()`: members only; it sends guests to `/join`
  - `requireBuyer()`: guests allowed
- `src/app/(app)/book/actions.ts`: stays, services, digital, sessions, tickets, quotes.
- `src/app/(app)/shop/actions.ts` → `saveProduct()`. It handles all six kinds.

Order delivery methods: `pickup`, `drop_off`, `rider`, `check_in`, `visit`, `download`, `session`, `event`.
Statuses include `requested` and `quoted` (for quotes) as well as the normal paid → ready → received flow.

## Run it locally

```bash
npm install
# Postgres needed. Then:
DATABASE_URL=postgres://... npm run db:migrate
DATABASE_URL=postgres://... SMS_TEST_MODE=true PAYSTACK_SECRET_KEY=sk_test_xxx \
  SITE_URL=http://localhost:3000 npm run dev
```

- `SMS_TEST_MODE=true` shows the OTP on screen instead of sending an SMS.
- To test payments without real Paystack, point `PAYSTACK_BASE_URL` at a small fake server. It must answer `/transaction/initialize`, `/transaction/verify/:ref` and `/refund`.
- **Always run `npm run build` before committing.** It also type-checks.

## Database changes

1. Edit `src/db/schema.ts`.
2. Run `npm run db:generate -- --name short_name`. It can ask questions interactively when you rename columns; answer them carefully.
3. Commit the new file in `drizzle/`. Render runs `npm run db:migrate` on every start, so the migration runs on deploy.

Important details:

- `users.isGuest`: the phone number is unique **only among non-guests** (a partial index). Every lookup of a member by phone must add `eq(users.isGuest, false)`.
- When a guest later joins (or logs in) with the same phone, `adoptGuestOrders()` in `actions.ts` moves their old orders into the member account.

## Deploying

- Repo: `github.com/asha-nephi/vouchly`, branch `main`.
- **Auto-deploy on push doesn't fire reliably.** After pushing, trigger a deploy from the Render dashboard (or the Render tool). Then check that the deploy reaches "live" and look at the logs.
- Render service: `srv-dbnfuarrjlhs738n0vhg`. Database: `dpg-dbnfttbrjlhs738mvqsg-a`. Workspace: `tea-dbfjig6c6qcc739v5pm0`.
- Health check: `/api/health`.
- Nephi has an outside cron job that pings the site every 5 minutes so the free server doesn't sleep.

### Environment variables (set in Render, never in code)

| Variable | What it does |
| --- | --- |
| `DATABASE_URL` | Postgres |
| `SITE_URL` | Public URL, used in share links and Paystack callbacks |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_BASE_URL` | Payments (base URL only for testing) |
| `PAYOUT_MODE` | `hold` = Vouchly holds the money until the buyer confirms; otherwise the pilot split pays sellers directly |
| `TERMII_API_KEY`, `TERMII_SENDER`, `TERMII_BASE_URL`, `SMS_TEST_MODE` | SMS |
| `FOUNDER_INVITE_CODE` | First invite code |
| `CRON_SECRET` | Protects `/api/cron/settle?key=...` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Photo storage |
| `R2_FILES_BUCKET` | Private bucket for digital product files. "vouchly-files" has been created but its keys are **not set yet**. Until they are, files are stored in the database with a 10MB limit; with R2 the limit is 25MB. |

## Known gotchas (learned the hard way)

- **No `loading.tsx` in route groups.** On Next 15.5 it made redirects from server actions hang for up to 60 seconds. The thin top bar (`src/components/nav-progress.tsx`) replaces it.
- **React empties file inputs when a form is reset after an error.** `PhotoPicker` and `FileInput` listen for the reset and put the files back. Radio choices that matter (kind, price type) also have hidden inputs. Keep this pattern for new forms.
- **Save uploaded files last,** after everything else has been validated, so a failed form doesn't leave unused files behind.
- **Lagos time:** Lagos is UTC+1 with no daylight saving. Use the helpers in `src/lib/sessions.ts` and `src/lib/dates.ts` rather than raw `Date` maths. Event dates are parsed as `YYYY-MM-DDTHH:mm:00+01:00`.
- **Unpaid holds:** an unpaid session booking or ticket holds the slot or seat for 30 minutes.
- **Discount floor:** a discount code can't bring a price below ₦100.
- **Every page must work at 320px wide** with no sideways scrolling. Check 320, 390 and 768px.

## Testing approach that has worked

Playwright is a good fit. Use a phone-sized viewport (390×844) and go through the real flow:

1. The seller creates a listing.
2. A guest in a fresh browser context buys it.
3. The fake Paystack confirms the payment.
4. Check both the buyer's order page and the seller's order page.

Always test the error paths too: a wrong code, a sold-out event, a member's phone used at guest checkout, and so on.

## What's done (as of 13 Nov 2026)

- Invites, OTP login, member and admin pages, shops, listings with photos, basket, checkout, delivery options
- Paystack split payments, refunds, payout account, cron settle job
- Order tracking with timelines, notification bell, reviews, dispute flow
- Stays (calendar, blocked dates), services (fixed price or quote)
- Guest buying from shared links, private order links, guest orders adopted when the guest joins
- Share previews (OG images), sitemap, robots
- Digital products with secure downloads
- Coaching sessions (time slots) and classes/events (tickets, seats, attendee list, message everyone)
- Seller dashboard:
  - Sales page with earnings, chart, top sellers and latest payments
  - Discount codes
  - Share-your-shop kit

## Still waiting on Nephi (not code)

- **Upgrade the Render free database before 7 Dec 2026.** The free one is deleted on that date.
- Set the R2 keys for `vouchly-files`.
- Set up the Paystack webhook URL in the Paystack dashboard.
- Register the business with the CAC.
- Email alerts are planned for later.

## How Nephi works

Ideas and marketing are discussed in a separate chat. They arrive here as feature requests. For each one:

1. If the request is unclear, ask one short question.
2. Build it, then test it in the browser.
3. Run `npm run build`.
4. Commit with a clear message, push, and deploy.
5. Confirm the deploy is live.
6. Reply in plain language: what changed and anything he needs to do.
