# UI upgrade brief

Goal: make Vouchly feel trustworthy and professional, and easier to use on a phone. Keep the same brand: Style C colors, Manrope font and plain words.

The approved mockups are in `docs/ui-mockups/` (open the `.dc.html` files and read the inline styles for exact sizes and colors):

| Mockup | Real page |
|---|---|
| `Main.dc.html` | `/home` |
| `Shop.dc.html` | `/s/[slug]` |
| `Listing.dc.html` | `/p/[id]` (item version; other kinds follow the same layout) |
| `Checkout.dc.html` | `/checkout` (and the buyer-details part of booking forms) |
| `Seller.dc.html` | `/shop/manage` |

The sample data in the mockups (names, numbers, colored photo blocks) is only for show. Always use real data. Hide anything we don't have rather than inventing it.

## Design rules for every page

1. **The "vouched" seal.** A small blue rosette with a white tick (the SVG is in the mockups) appears next to every confirmed member's shop name: on cards, the listing's seller row and checkout. Make it one shared component, `src/components/seal.tsx`. It is the brand's signature, so don't use it for anything else.
2. **Photos first.** Listings show as a 2-column grid of square photo tiles (radius 18px). Put a small white pill on the photo for key info (Pre-order · Sat, Instant download, a date for events). Use `next/image` with proper `sizes`. If a listing has no photo, use a soft colored block with the first letters of its name, not an empty box.
3. **One main action per screen, in a bar at the bottom.**
   - Listing page: a quantity stepper plus "Add to basket · ₦X". Use the right label for each kind: Book / Get tickets / Buy / Ask for a price.
   - Checkout: "Pay ₦X" with a lock icon.
   - Shop page, when the basket has items: a floating navy bar showing "N items · ₦X" with a "Check out" button.
   - These bars must **never overlap** the guest bar or tab bar. On listing and checkout pages, hide the tab or guest bar and show only the action bar. Add bottom padding to `main` so the last content is never hidden.
4. **"How you're protected" box** (soft blue, `#DCE4FB`) on listing pages and in short form at checkout. It has three lines: the seller is a confirmed member, payment goes through Paystack, and problems can be reported within 48 hours. The wording must match how payouts actually work (`PAYOUT_MODE`).
5. **Type scale:**

   | Use | Size and weight |
   |---|---|
   | Page title | 26–28px / 800, letter-spacing −0.02em |
   | Section title | 17–19px / 800 |
   | Body | 14–15px |
   | Meta | 12–13px / 600 in `#5A6478` |

   Money is always 800 weight with `tabular-nums`.
6. **Surfaces:** white cards with a 1px `#E6E9EF` border and radius 18px (22px for hero cards), and no heavy shadows. The only shadow is on the floating basket bar.
7. **Chips** for categories and filters scroll sideways (`overflow-x: auto`, scrollbar hidden). The active chip is navy with white text.
8. **Touch targets are at least 44px.** Every icon-only button has an `aria-label`. Text contrast is at least 4.5:1.
9. **Green (`#1D7A46`) is only for "Free" and discounts. Red is only for counts that need attention.**

## Page by page

### Home (`/home`)
- Top row: location pill, the "Vouchly" wordmark (text), notification bell.
- Greeting, the "What do you need today?" heading, and a large search box.
- Category chips. Add **Classes** (session and event listings) and **Downloads** (digital), which filter by product kind.
- **Fresh this week**: a 2-column grid of the newest active listings near the user (up to 6), with a "See all" link to search.
- **Classes and coaching**: a sideways row of upcoming events (soonest first) and sessions, showing a date block, title, place/online, price and seats left. Hide the section if there are none.
- **Shops near you**: the existing list, restyled with initials avatar, seal, ward and rating.

### Shop page (`/s/[slug]`)
- Cover photo (`shops.coverPhoto`; fallback is a solid brand-tone block) with back and share buttons on top.
- An overlapping white card containing:
  - initials avatar
  - a "Vouched by [ward]" pill
  - shop name and about text
  - a 3-number stats row: rating with review count, orders completed, and "selling since" year from `shops.createdAt`. Hide any stat that is zero.
- Next delivery card (existing delivery info).
- Filter chips by kind, each with a count; hide chips with 0.
- 2-column listing grid. Each tile has: photo, name, price, and a small soft-blue action button (Add / Book / Tickets / Buy / Ask).
- Floating basket bar when the basket isn't empty.

### Listing page (`/p/[id]`)
- Photo gallery (swipe with CSS scroll-snap, dot indicators, no extra library), 360px tall.
- A kind pill, then title, then the big price with its unit ("for 1 litre", "a night", "a session").
- Description, then the seller row (avatar, name and seal, rating · orders · ward).
- "How you can get it" list for items. The existing info cards for stays, services, sessions and events are restyled to match.
- The protection box, then the latest review with a "See all" link.
- Bottom action bar as described in rule 3.

### Checkout (`/checkout` and the booking forms)
- An order summary card at the top: thumbnail, item × qty, seller with seal, price, delivery day.
- Three numbered sections: **1 Your details** (guests only), **2 How do you want it?** (radio cards; the chosen one gets a 2px blue border), **3 Check and pay** (totals, discount row, "Add a note for the seller" as a dashed button that opens the textarea). The discount code field stays collapsible.
- A short Paystack line, then the bottom pay bar.

### My shop (`/shop/manage`)
- Header with shop name and open/closed status, plus a "View as buyer" button.
- Navy earnings card: earned this week (after 5%), number of sales, and a 7-day mini bar chart with today highlighted. "Details" goes to `/shop/manage/sales`.
- **Needs you now**: a list of orders waiting on the seller (new paid orders, quotes to price, items to mark ready, bookings to accept), each with its action button and a red count. Reuse `sellerNext()` from `order-status.ts`. If the list is empty, show "You're all caught up."
- 4 quick actions (Add listing, Sales, Discounts, Edit shop), then the share-your-shop card, then the listings list with a one-line status (sold this week, seats taken, downloads).

## Also fix while you're in there
- **Loading:** add light grey placeholder blocks for the photo grids on slow connections. Use CSS only, and don't bring back `loading.tsx`.
- **Empty states:** every list needs a helpful empty message with a next step ("No orders yet. Share your shop link to get your first sale.").
- **Feedback:** after a successful action (saved, accepted, copied), show a small toast that disappears after 3 seconds.

## Don't
- Don't add new npm packages for UI.
- Don't change prices, payment logic or database tables. This is a visual upgrade. If something truly needs new data, ask first.
- Don't use emoji as icons. Use inline stroke SVGs like the mockups.

## Done means
- Every page above matches its mockup at 390px wide and still works at 320px and 768px, with no sideways scrolling.
- All existing flows still work: guest checkout, bookings, tickets, downloads, discounts, and the seller order actions.
- `npm run build` passes. Take before/after screenshots of each page, commit, push, deploy and confirm the deploy is live.
