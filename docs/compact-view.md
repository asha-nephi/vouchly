# Compact view for the seller and admin areas

Busy sellers and admins handle many orders, listings and members. On a computer, give them an optional **compact view**, inspired by the AWS console: dense tables, filter chips, adjustable columns, row selection and a side panel for details.

Copy the patterns, not AWS's look. **Don't install Cloudscape** or any table library. Build it with our Style C tokens and Tailwind.

## Rules

- **Computers only (`lg`, 1024px and wider).** Phones keep today's spacious layout with 44px tap targets. Never show compact on a phone, even if the setting is on.
- **Buyer pages never change:** home, browse, shop, listing, basket, checkout and the buyer's own orders.
- **A switch, not a forced change.** "Comfortable / Compact" sits in the seller sidebar footer and the admin header. Default: Comfortable. Save the choice in a cookie (`vl_density=compact`) so pages render correctly on the server with no flash.
- **Same data, same actions, same server rules.** Compact changes only the layout. Every action still goes through the existing server actions and permission checks.
- **Keep it light.** Tables are server-rendered. The only client code is for selection, the column picker and the side panel. Filters live in the URL (search params), so a filtered view can be bookmarked or shared and the back button works.

## Shared pieces (build these first, in `src/components/data/`)

1. **`DataTable`**
   - **Size:** compact rows 36px high (comfortable 52px); 13px text; 12px cell padding.
   - **Header:** sticky, with sortable columns (`?sort=amount&dir=desc`).
   - **Columns:** money right-aligned in `tabular-nums`.
   - **Rows:** optional checkbox column and a row hover state; clicking a row opens the side panel.
   - **When empty:** an empty-state slot.
   - **When long:** pagination (25 / 50 / 100 per page), or "Load more" if simpler.
   - Works with the keyboard: arrow keys move between rows, Enter opens a row, Space ticks it.
2. **`FilterBar`**
   - A search box, plus "Add filter" (a menu of the page's filters).
   - Active filters show as chips (`Status = Paid ×`), with "Clear filters".
   - **Saved views:** up to 5 per page. Store them in a new small table `saved_views (user_id, page, name, query)`, which needs a migration.
3. **`ColumnPicker`**
   - A gear button. Tick columns on or off and drag to reorder.
   - Saved per person per page in the same `saved_views` table (row with `name = '__columns'`).
4. **`SidePanel`**
   - Opens on the right (480px wide) when a row is clicked, showing that record's detail and actions.
   - The URL keeps `?open=<id>`, so a refresh or shared link reopens it.
   - Esc closes it. On screens narrower than 1280px it overlays the table instead of pushing it.
5. **`BulkBar`**
   - Appears when rows are ticked: "3 selected · Mark ready · Export CSV · Clear".
   - Bulk actions call the same server actions one record at a time, inside one request. The bar shows "Done 3 of 3", or which ones failed and why.
6. **`DensitySwitch`**
   - The Comfortable / Compact toggle described above.
7. **CSV export**
   - Exports what the current filters show, using the visible columns.
   - Formula-safe: any cell starting with `= + - @` gets a leading `'`.

## Pages

### Seller: Orders (`/shop/manage/orders`)
- **Columns:**
  - Order code
  - Date placed
  - Buyer (name; "Guest" tag)
  - Items (first item + "+2 more")
  - How (pickup / drop-off / rider / visit / session / event / download)
  - Delivery or booking day
  - Status (coloured pill)
  - Total
  - You get
- **Filters:** status, delivery day, how, date placed (today / this week / custom), buyer search, needs-action-only.
- **Saved views to start with:** "Needs me now", "This Saturday", "Paid, not ready".
- **Side panel:** the same content as `orders/[code]`: timeline, buyer contact (phone, WhatsApp link), items, address, note, and the next-action button (`sellerNext()`).
- **Bulk:** Mark ready, Mark delivered (only where allowed), Print day list, Export CSV.

### Seller: Delivery day list (`/shop/manage/orders/day/[day]` and `/shop/manage/delivery`)
- One compact table per group (Pickup / Drop-off by area / Rider).
- **Columns:** order, buyer, phone, area/address, items × qty, note, paid, a checkbox for "packed".
- A packing summary at the top (item × total qty).
- Print stays clean: no sidebar, no filter bar, black text.

### Seller: Listings (the list on `/shop/manage`, plus a new `/shop/manage/listings`)
- **Columns:**
  - Photo thumbnail (40px)
  - Name
  - Kind
  - Collection
  - Price
  - Stock (or seats left / slots)
  - Sold this week
  - Status (on/off switch)
  - Updated
- **Edit in the row:** price and stock open a small inline input. Saving uses the existing save action and shows a toast.
- **Filters:** kind, on/off, sold out, collection, search.
- **Bulk:** Switch on, Switch off, Add to collection, Copy, Export CSV.
- **Side panel:** quick view with a link to the full edit page.
- The `/shop/manage` overview keeps its cards and links to this page with "Manage all listings".

### Seller: Sales (`/shop/manage/sales`)
- Keep the earnings cards and chart at the top. Make "Latest payments" a full `DataTable`.
- **Columns:** date, order, buyer, item(s), paid, Vouchly fee, you get, payout status (held / released / refunded), paid out on.
- **Filters:** date range, payout status.
- CSV export (sellers will want it for records and tax).

### Seller: Discounts (`/shop/manage/discounts`)
- **Columns:** code, type, amount/percent, used / limit, ends, status, created.
- **Bulk:** Switch off.
- **Side panel:** the orders that used the code.

### Seller: Collections (`/shop/manage/collections` and `[id]`)
- Collections list: name, listings in it, link, status.
- Inside one collection: the Listings table filtered to it, with "Remove from collection" as a bulk action.

### Seller: Event attendees (`/shop/manage/products/[id]/attendees`)
- **Columns:** name, phone, tickets, ticket code, paid, checked in (checkbox).
- **Filters:** paid / unpaid / checked in.
- **Bulk:** Message selected, Export CSV.
- **Search** by name or code, for the door on the day.

### Seller: Bookings calendar (`/shop/manage/products/[id]/calendar`)
- Keep the calendar. Add a compact "List" tab: date, time, client, status, paid, with the same side panel as orders.

### Admin: Members (`/admin/members`)
- **Columns:** name, email, phone (checked or not), ward, role, seller type, shop, joined, last active, status.
- **Filters:** role, ward, has shop, status (active / suspended / waiting for confirmation).
- **Saved views:** "Waiting for ward confirmation", "New this week".
- **Side panel:** profile, invite used and who invited them, shop link, orders count, actions (confirm, suspend, change role). Every action is audited, as today.
- **Bulk:** Confirm, Export CSV.

### Admin: Problems / disputes (`/admin/problems`)
- **Columns:** opened, order, buyer, seller, reason, amount, status, days open.
- **Filters:** status, older than 2 days.
- **Side panel:** the order timeline, both sides' messages, and actions (refund, release, close).

### Admin: new pages (same components, read-mostly)
- **`/admin/shops`:** shop, owner, seller type, ward, listings, orders this month, sales this month, payout account set (yes/no), status, created.
- **`/admin/payments`:** date, reference, order, shop, amount, fee, seller share, status, released at, refunded. Filters: status, date, shop. CSV export. This is how Nephi checks Paystack against Vouchly.
- **`/admin/invites`:** code, created by, used by, used on, status.

Add these to the admin sidebar. Admin pages use compact by default; the switch still lets admins choose comfortable.

## Done means
- Every page above works in both Comfortable and Compact at 1024px, 1280px and 1440px, and is unchanged on phones (390px).
- Filters, sort, open panel and page all live in the URL; refresh and back/forward keep them.
- Keyboard: Tab reaches the filter bar, table, rows and panel. Arrow keys move between rows; Enter opens; Esc closes.
- Bulk actions report what worked and what didn't. CSV exports are formula-safe.
- No new npm packages. `npm run build` passes. Screenshots of each page in both modes. Commit page by page, push, deploy, and confirm the deploy is live.
