# AI v1: listing writer, marketing kit, smart search

The goal is to help sellers describe and market what they sell, and to help buyers find things by typing plain sentences.

AI always writes a **draft the person can edit**. It never saves, posts or sends anything on its own.

## The AI provider (one switch)

Make one small module, `src/lib/ai.ts`, that every feature calls:

```ts
aiJSON({ task, system, prompt, image?, maxTokens }): Promise<object | null>
```

- It returns parsed JSON, or `null` on any failure. Features must work, or quietly hide, when it returns `null`.
- `AI_PROVIDER` chooses who answers:
  - `cloudflare` (now): Workers AI over its REST API:
    `POST https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{model}` with `Authorization: Bearer {CF_AI_TOKEN}`. Use plain `fetch`, with no Cloudflare SDK and no new npm packages.
  - `anthropic` (later, when Nephi has credit): the Claude Messages API with `ANTHROPIC_API_KEY`. Default model `claude-haiku-5-5`, set by `AI_MODEL_TEXT`.
  - not set: AI is off, and all AI buttons are hidden.
- Models come from settings, not code: `AI_MODEL_TEXT` and `AI_MODEL_VISION`.
  - For Cloudflare, pick text and vision models that are **available on the Workers Free plan** and not marked "planned deprecation". Check the catalog at https://developers.cloudflare.com/workers-ai/models/ when you build.
  - At the time of writing, `@cf/meta/llama-4-scout-17b-16e-instruct` handles both text and photos.
  - If a model returns Meta's "agree to the license" error, send one `{"prompt":"agree"}` request and retry once.
- Ask for JSON only. Parse it safely: pull out the first `{…}` block, and treat bad JSON as `null`.
- Add `AI_BASE_URL` so tests can point at a fake server (like `fake-paystack.js`).
- Use a 20-second timeout. Return `null` on 429, 403 or "out of capacity" errors and log them, so they never crash a page.

### Limits (so the free allowance lasts)
- Add an `ai_usage` table: `user_id` (nullable), `ip_hash`, `feature`, `day` (Lagos date), `count`. This needs a migration.
- **Per seller:** 30 AI uses a day. **Per buyer or IP:** 20 smart searches a day. **Whole site:** `AI_DAILY_LIMIT` (default 300). When a limit is hit, say in plain words: "AI help is resting for today. Try again tomorrow, or write it yourself."
- Cache answers to save allowance:
  - smart search, by the cleaned-up query, for 1 day
  - marketing posts, by listing + post type + language, for 1 day

### Rules for every prompt
- Plain, warm, simple English (or Pidgin when asked). No hype words like "premium", "best in Lagos" or "world-class" unless the seller wrote them.
- **Never invent facts:** no sizes, ingredients, guarantees, delivery times or prices the seller didn't give.
- Never include phone numbers, links or the Church's name. Code adds links, not the AI.
- Clean all AI output before showing it: strip HTML and cut it to set lengths.

## 1. Listing writer ("Write it for me")

**Where:** the add/edit listing form, for all six kinds. The button sits next to the name field.

**The seller gives:**
- a few words ("zobo 1 litre, ginger, no sugar")
- optionally, the first photo they picked (resize it on the phone to at most 768px JPEG before sending, to keep it fast on slow data)

The listing kind, shop category, seller type and trades are passed automatically.

**AI returns JSON:**
- `name` (60 characters max)
- `about` (2–4 short sentences, 400 characters max)
- `tags` (up to 5)
- `category` (one of our existing values)
- for services, `included` (up to 4 short lines, but only from what the seller said)

**Prices come from our data, not from AI.** Below the price box, show "Similar listings on Vouchly: ₦2,000 – ₦3,500". Work this out from active listings of the same kind and category (the middle half of the prices, needing at least 3 listings, otherwise hide it).

**How it fills the form:** the drafted fields fill in and get a small "Written with AI. Check it before saving." note. The seller edits and saves as normal. Add an **Undo** button that puts back what they had typed.

## 2. Marketing kit ("Make a post")

**Where:**
- on each listing in the seller area (computer and phone)
- on the seller's share card, which makes a post about the whole shop

**Options:**
- post type: WhatsApp status, Instagram caption, or WhatsApp broadcast message
- language: English or Pidgin

**AI returns** `{ text }`:
- status: 1–2 lines
- caption: up to 4 lines and up to 5 hashtags
- broadcast: a short friendly message

The code then adds the exact listing or shop link, plus "Pay safely on Vouchly". The AI never writes the link.

**Buttons:** Copy, Share to WhatsApp (`wa.me/?text=`), and "Try another" (up to 3 versions per listing a day).

## 3. Smart search

**Where:** the main search box (top bar on computers, search page on phones).

**When it runs:** only when the query looks like a sentence: 4 or more words, or containing words like "need", "someone", "tomorrow", "near", "cheap". Short queries ("zobo") use normal search with no AI.

**AI returns JSON**, and every field is checked against our real values:

```
{ section: "products" | "services" | "online",
  trade?: one of our trades, category?: one of our categories,
  area?: one of our areas, when?: "today" | "tomorrow" | "this_week",
  maxPriceNaira?: number, keywords?: string }
```

**What happens next:**
- Throw away anything that doesn't match a real value, then go to the normal filtered URL (for example `/home?s=services&trade=ac_repair&area=ikeja&when=tomorrow`).
- Show a small line above the results: "Showing: AC repair · Ikeja · free tomorrow", with a **Change** link that opens the filters.
- If AI returns `null` or the limit is hit, fall back to normal keyword search. The buyer should never see an error.

## Testing
- Add `scratchpad`-style fake AI servers for Cloudflare and Anthropic that return fixed JSON, so all three features can be tested with no internet.
- Test the paths where things go wrong: AI off (no buttons shown), AI returns bad JSON, AI times out, a limit is reached, and a made-up trade or area in the search answer gets ignored.
- Check at 390px and 1440px. Run `npm run build`, commit each feature on its own, push, deploy, and confirm the deploy is live.

## Settings (Nephi adds these in Render)

| Name | Value |
|---|---|
| `AI_PROVIDER` | `cloudflare` |
| `CF_ACCOUNT_ID` | Cloudflare account ID |
| `CF_AI_TOKEN` | API token with Workers AI access |
| `AI_MODEL_TEXT`, `AI_MODEL_VISION` | Optional; defaults in code |
| `AI_DAILY_LIMIT` | Optional; default 300 |

Later, to switch to Claude: set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`. Nothing else changes.

Update `CLAUDE.md` with these settings and the AI rules when done.
