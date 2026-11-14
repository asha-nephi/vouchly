# UI v2: four ways in, and a real desktop layout

Read `docs/ui-upgrade.md` first. Its design rules still apply: Style C colors, Manrope, the vouched seal, plain words, 44px tap targets.

This brief adds three things:
1. The platform is split into four groups.
2. Computers get their own layout instead of a stretched phone screen.
3. The landing page is rebuilt without a photo.

The mockups are in `docs/ui-mockups/`:

| Mockup | Page |
|---|---|
| `Landing.dc.html` | Landing page on a computer (`/`) |
| `MLanding.dc.html` | Landing page on a phone (`/`) |
| `Join.dc.html` | Sign-up step 1, "What brings you to Vouchly?" |
| `AppHome.dc.html` | Buyer browse page on a computer (the Services section is shown) |
| `DListing.dc.html` | Listing page on a computer (a service is shown) |
| `DSeller.dc.html` | Seller dashboard on a computer (a service pro is shown) |

The sample names and numbers are only for show. Use real data, and hide anything we don't have.

## 1. The four groups

| Group | Who | What they use |
|---|---|---|
| **Buyers** | Anyone | Shop, hire, learn. No invite needed. |
| **Service pros** | Plumbers, electricians, AC repair, cleaners, chefs, tailors, hair and beauty, tutors | Listings of kind `service` (and `session` for tutors) |
| **Online sellers** | Coaches, teachers, writers, designers | `digital`, `session`, `event` |
| **Product sellers** | Food, drinks, fashion, crafts, physical stores, stays | `item`, `stay` |

### Buyers see three sections
- **Products**: `item` and `stay` listings.
- **Services**: `service` listings, shown as **pro cards**. A pro card has an avatar, name with seal, trade, ward, the "free tomorrow / this week" availability worked out from working days and existing bookings, rating, a price or "Ask for a price", and a Book or Ask button.
- **Online**: `digital`, `session` and `event` listings. Classes held in person also belong here, labelled with their place.

Put the sections as tabs in the top bar on a computer, and as a segmented control on the phone home and search pages. The section in the URL (`/home?s=services`) keeps it linkable. Search and filters work inside the chosen section.

### Sellers pick their path at sign-up
- `Join.dc.html` shows **"What brings you to Vouchly?"** with four cards. The buying card needs no invite; the other three show "Needs a member invite".
- After a selling path is picked, show chips for what they do (trades, kinds of online offer, or kinds of product). These decide where buyers find them.
- **One database change:** add `seller_type` to `shops` (`service` | `online` | `products`) plus a `trades` text array. Write the migration. Existing shops get filled in from their category: `repairs`, `home_care`, `chefs` → service; `learning` → online; everything else → products.
- The seller's dashboard menu, the "add listing" choices and the wording depend on `seller_type`:
  - **Service pro:** Requests, Bookings, Calendar, My services, "Add a service"
  - **Online seller:** Sales, Sessions, Classes, Downloads, "Add a product"
  - **Product seller:** Orders, Delivery days, Products, "Add a product"

  A seller can still add any kind from "Add listing → More types". This only changes what they see first.
- Existing buyer sign-up (email/password and Google) stays as it is. The chooser sits in front of it.

## 2. Desktop layout (screens 1024px and wider)

The rule: **phones keep the current bottom-tab layout; computers get a top bar and wider multi-column pages.** Use Tailwind `lg:` classes in the same components, rather than separate pages.

- **Top bar:** wordmark, a wide search box, area picker, "Sell on Vouchly", basket with count, bell, avatar. Section tabs (Products / Services / Online) sit underneath it. Hide the bottom tab bar and the floating basket bar at `lg`.
- **Content width:** `max-w-[1280px]` with 24px side padding. Never stretch a phone column across a big screen.
- **Browse pages** (home, search, a category):
  - A filter sidebar on the left (about 240px wide). The filters depend on the section:
    - Services: type of work, when, price type, rating
    - Products: category, delivery method, price
    - Online: type, online or in person, date
  - A grid on the right: `repeat(auto-fill, minmax(290px, 1fr))` for pro cards, and 4 columns for product tiles.
  - On phones, the sidebar becomes a "Filters" button that opens a bottom sheet.
- **Listing page:** two columns.
  - Left: a photo mosaic (one big photo plus two small ones, the last showing "+N photos"), title, a seller row with stats, info cards, description, "What's included", reviews.
  - Right: a **sticky booking/buy box**. The box holds the price, the date and time picker (services and sessions) or quantity (items), a note, the main button and a second button ("Ask for a price first" where it fits), and the short protection box.
  - The phone keeps the current bottom action bar.
- **Shop page:** the cover and profile card span the full width, then the listing grid in 3–4 columns.
- **Checkout:** a form on the left and the order summary on the right; on a computer, the summary is sticky.
- **Seller area (`/shop/manage/*`) on a computer:**
  - A navy left sidebar holding the shop switcher card, menu items (with red counts for things waiting), "View my page" and "Switch to buying".
  - Main area:
    - greeting
    - 4 number cards: earned this week, jobs/orders this week, waiting on you, rating
    - "Needs you now" (wide) next to "This week" (calendar list)
    - a latest-payments table
  - The phone keeps the current layout.
- Admin pages use the same sidebar layout on a computer.

## 3. Landing page (`/`)

- **Remove the market woman photo**, its caption and credit, and delete `public/images/market-maker.jpg`. Use no stock photos anywhere.
- New structure:
  1. Header: Shop products / Hire a pro / Learn online · Sell on Vouchly · Log in · Sign up.
  2. Hero:
     - headline "Buy from people you can trust."
     - a search box with the Products/Services/Online switch and an area picker
     - popular search chips
     - on the right, a stack of three small live-looking cards (a pro, two products, a class) built from real listings, with no images needed
  3. "What are you looking for?": three door cards.
  4. Three trust facts.
  5. A navy "Make money on Vouchly" section with three earner cards and "Start selling".
  6. "How selling works" in 3 steps.
  7. Footer with the address and the not-affiliated line.
- On a phone, follow `MLanding.dc.html`.

## 4. Speed (keep it fast)

- Don't add new npm packages. Use CSS for layout, sticky boxes and bottom sheets.
- Keep pages as server components. Use client components only for small interactive parts (section switch, filters sheet, date picker).
- Use `next/image` with correct `sizes` on every photo. The first row loads with priority; everything else loads lazily.
- Links use `next/link` so pages prefetch and clicks feel instant. Filters update the URL (search params) so pages stay shareable and back/forward work.
- Aim for a Lighthouse mobile performance score of 90+ on `/`, `/home`, `/s/[slug]` and `/p/[id]`, with no layout shift when photos load.

## Done means

- Every mockup matches at its size, and every page works at 320px, 390px, 768px, 1024px and 1440px with no sideways scrolling.
- Nothing from the phone layout shows on a computer (no bottom tab bar, no stretched single column), and nothing from the desktop layout shows on a phone.
- All existing flows still work: guest checkout, buyer accounts, bookings, quotes, tickets, downloads, discounts and seller actions.
- `npm run build` passes, with screenshots at 390 and 1440 for each page. Commit after each part, push, deploy, and confirm the deploy is live.
