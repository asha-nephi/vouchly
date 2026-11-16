# Easier seller sign-up: plan

I went through sign-up as a brand-new food seller on a phone-sized screen (390px), from the home page to a first listing.

## What happens today

A product seller goes through **8 screens**, then waits for an unknown time in the middle:

1. Pick a path ("I sell products") and tap what you sell
2. "Make your account" page (just two buttons)
3. Account form (name, email, phone, password), or Google and then phone
4. Ward and invite code
5. **Wait for the ward contact.** Nothing tells you when you're confirmed.
6. Shop form: name, seller type (again), chips (again), category, area, about, cover photo
7. Delivery: days, closing time, pickup, drop-off, rider (14 fields)
8. First listing: photo, name, price and more
9. Payout account. The setup never asks for it. It only sits as a row on the dashboard.

## Where people get stuck

| # | Problem | What the seller sees |
|---|---|---|
| 1 | **The two pages disagree.** Step 1 says "you can set up your shop while you wait", but `/sell` then says "You can open a shop once your ward contact confirms you". | Feels blocked. Gives up. |
| 2 | **No message when confirmed.** The page says "You'll see it on your home screen", but after confirmation the home page doesn't mention selling at all. | Doesn't know they can start now. |
| 3 | **Questions asked twice.** Seller type and the "What do you sell?" chips were already answered at step 1. The shop form also has two different "What do you sell?" questions, the chips and a dropdown. | Confusing. |
| 4 | **"Optional" field that is required.** On the delivery page, "Pickup spot (optional)" has to be filled in. The error shows at the very bottom of a long page. | Taps Continue, nothing seems to happen. |
| 5 | **The delivery page is long** (14 fields) and comes before the first listing. | Tiring before the fun part. |
| 6 | **Payout account is never asked for** during setup. If payments aren't in "hold" mode, buyers see "hasn't set up payments yet" and can't pay. | Shop looks live, but can't take money. |
| 7 | **An empty shop says "Shop is open. Buyers can order now"**, even with no listings. | Wrong signal. |
| 8 | **No "what's left" list.** The dashboard has no checklist of what's still missing. | Doesn't know what to do next. |
| 9 | **The Me page says "Phone number checked: Done"**, but phone checks are paused. | Small, but untrue. |
| 10 | **No way to get help.** There's no "chat with us" link anywhere. An empty shop tells buyers to "message the seller through a friend". | Stuck with no one to ask. |

What worked well: the path chooser, the invite link that fills in the code for you, the "Similar listings: ₦x" hint, a clear error for a wrong invite code, and no sideways scrolling at 390px.

## The new flow: 4 screens to a live shop

1. **What will you sell?** Same as today: pick a path and tap your chips.
2. **Your account.** Google, or the email form. **Ward and invite code are on this same screen**, so there's no separate step. (Google users fill in phone, ward and code on the one page after Google.)
3. **Your shop.** Only 2 fields: **shop name** and **area**. We take seller type and category from step 1 and show them as "Selling: Food, Drinks · change".
4. **Your first listing.** Photo, name, price. "Write it for me" fills in the rest. Everything else is under "More details (optional)".
5. **Done: "Your shop is ready."** A big "Share on WhatsApp" button, then the checklist.

### Moved to later (on the checklist, not in the way)
- Cover photo and "About your shop"
- Delivery settings
- Payout account
- Discount codes, and anything else extra

### Smart defaults
- **Delivery:** pickup on, Saturday, orders close Thursday 6pm, pickup spot is the seller's area. Fixes problem 4. Service and online sellers skip delivery, as today.
- **Category** comes from the chips (Food or Drinks → Food & drinks, Fashion → Fashion, and so on).
- **Listing:** "Pre-order", no daily limit, and search words filled in by AI when it's on.
- **Shop name:** we suggest "Ada's Kitchen" from their first name and chip. They can change it.

### "Finish your shop" checklist (top of the seller dashboard)
A progress bar ("3 of 6 done") and one row per job, each with a button. It hides once everything is done.
- ✓ Shop made
- Add your first listing
- **Add your bank account so you get paid** (shown in red when buyers can't pay without it)
- Check your delivery days (already set: Saturday pickup)
- Add a shop photo (optional)
- Share your shop on WhatsApp
- Waiting for your ward contact to confirm you (only if not confirmed yet)

### Help
- A line at the bottom of every setup screen and on the checklist: **"Stuck? Chat with us on WhatsApp"** (a `wa.me` link with a ready message like "Hi, I need help setting up my Vouchly shop").
- Short help lines under hard fields, for example under bank account: "We only pay into this account. We never ask for your PIN."

### Small fixes, whatever option you pick
- Tell the member when they are confirmed (bell notice: "You're confirmed. Your shop is live.").
- The home page shows a "Finish your shop" card to sellers until the checklist is done.
- An empty shop says "Add a listing so buyers can order", not "Buyers can order now".
- The Me page stops saying the phone was checked while checks are paused.
- An empty shop page for buyers says "Nothing for sale yet. Check back soon."

## The one real choice: what about waiting for confirmation?

**Option A: Build while you wait (my pick).**
New members do all 4 screens straight away. Their shop is saved but **hidden from buyers** until the ward contact confirms them. Then it goes live by itself, and they get a notice. The checklist shows "Waiting for your ward contact".
*Good:* no dead end, and they are ready to sell on day one. *Cost:* some shops will be built by people who are never confirmed (they just stay hidden).

**Option B: Confirm first, but tell them.**
Same as today, but we send a notice the moment they're confirmed, with a button that goes straight to shop setup.
*Good:* least change. *Cost:* still a dead end. Many people won't come back.

**Option C: A valid invite code is enough to sell.**
The member who invited them vouches for them. The ward contact can still check them and remove them later.
*Good:* fastest. *Cost:* trust depends on whoever shares their code, and the "Verified member" badge means less.

## Three questions for you

1. **A, B or C?** (I suggest A.)
2. **Which WhatsApp number** should the "Chat with us" link use? (A phone number isn't a secret. It can go in Render as `HELP_WHATSAPP`, or I can put it in the code.)
3. **Is the live site in "hold" mode** (`PAYOUT_MODE=hold` in Render)? If yes, buyers can already pay before the seller adds a bank account (Vouchly holds the money). If not, a shop can't take money until the bank account is added, so that row should be red and come first.
