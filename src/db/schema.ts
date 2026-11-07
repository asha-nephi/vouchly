import {
  pgTable, pgEnum, uuid, text, integer, boolean, timestamp, smallint, jsonb, uniqueIndex, index, customType,
} from "drizzle-orm/pg-core";

// Money is stored in kobo (₦1 = 100 kobo) so there are no rounding errors.

export const category = pgEnum("category", ["food", "stays", "repairs", "fashion", "home_care", "events", "tech"]);
export const sellMode = pgEnum("sell_mode", ["preorder", "in_stock"]);
export const deliveryMethod = pgEnum("delivery_method", ["pickup", "drop_off", "rider"]);
export const riderPayer = pgEnum("rider_payer", ["buyer_on_arrival", "fee_in_order"]);
export const orderStatus = pgEnum("order_status", [
  "awaiting_payment", "paid", "confirmed", "preparing", "ready", "on_the_way", "received", "cancelled", "disputed",
]);
export const paymentStatus = pgEnum("payment_status", ["pending", "held", "released", "refunded", "part_refunded"]);

export const userRole = pgEnum("user_role", ["member", "ward_contact", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull(), // stored as 234XXXXXXXXXX
  email: text("email"),
  ward: text("ward").notNull(),
  area: text("area"),
  role: userRole("role").notNull().default("member"),
  inviteCode: text("invite_code").notNull(), // this member's own code to invite others
  invitedById: uuid("invited_by_id"),
  confirmed: boolean("confirmed").notNull().default(false),
  confirmedById: uuid("confirmed_by_id"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("users_phone_idx").on(t.phone), uniqueIndex("users_invite_code_idx").on(t.inviteCode)]);

// One-time sign-in codes. A sign-up keeps the form details in `signup` until the code is checked.
export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  signup: jsonb("signup").$type<{ name: string; ward: string; invitedById: string | null; founder: boolean }>(),
  attempts: smallint("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("otp_phone_idx").on(t.phone, t.createdAt)]);

// Photos are kept in the database for now (already shrunk on the phone).
// Swap src/lib/photos.ts to Cloudflare R2 later without touching anything else.
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("sessions_token_idx").on(t.tokenHash)]);

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  about: text("about"),
  category: category("category").notNull(),
  area: text("area").notNull(),
  coverPhoto: text("cover_photo"),
  paystackSubaccount: text("paystack_subaccount"),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("shops_slug_idx").on(t.slug), index("shops_area_cat_idx").on(t.area, t.category)]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  size: text("size"),
  priceKobo: integer("price_kobo").notNull(),
  photos: jsonb("photos").$type<string[]>().notNull().default([]),
  sellMode: sellMode("sell_mode").notNull().default("preorder"),
  maxPerDay: integer("max_per_day"),
  isActive: boolean("is_active").notNull().default(true), // seller paused it
  removed: boolean("removed").notNull().default(false), // seller deleted it
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("products_shop_idx").on(t.shopId)]);

export const deliverySettings = pgTable("delivery_settings", {
  shopId: uuid("shop_id").primaryKey().references(() => shops.id, { onDelete: "cascade" }),
  deliveryDays: jsonb("delivery_days").$type<number[]>().notNull().default([6]), // 0=Sun … 6=Sat
  orderCutoff: text("order_cutoff").notNull().default("thu 18:00"),
  pickupOn: boolean("pickup_on").notNull().default(true),
  pickupSpot: text("pickup_spot"),
  pickupHours: text("pickup_hours"),
  dropOffOn: boolean("drop_off_on").notNull().default(false),
  dropOffAreas: jsonb("drop_off_areas").$type<string[]>().notNull().default([]),
  dropOffFeeKobo: integer("drop_off_fee_kobo").notNull().default(0),
  riderOn: boolean("rider_on").notNull().default(false),
  riderPayer: riderPayer("rider_payer").notNull().default("buyer_on_arrival"),
  riderEstimate: text("rider_estimate").default("₦2,000 – ₦3,500"),
  riderAreaFees: jsonb("rider_area_fees").$type<Record<string, number>>().notNull().default({}), // kobo per area
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(), // e.g. VL-2041
  buyerId: uuid("buyer_id").notNull().references(() => users.id),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  deliveryDay: timestamp("delivery_day", { withTimezone: true }).notNull(),
  method: deliveryMethod("method").notNull(),
  address: text("address"),
  note: text("note"),
  itemsKobo: integer("items_kobo").notNull(),
  deliveryFeeKobo: integer("delivery_fee_kobo").notNull().default(0),
  riderName: text("rider_name"),
  riderPhone: text("rider_phone"),
  riderCostKobo: integer("rider_cost_kobo"),
  riderTrackingUrl: text("rider_tracking_url"),
  status: orderStatus("status").notNull().default("awaiting_payment"),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("orders_code_idx").on(t.code), index("orders_buyer_idx").on(t.buyerId), index("orders_shop_day_idx").on(t.shopId, t.deliveryDay)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  name: text("name").notNull(), // copied so old orders keep their name
  size: text("size"),
  quantity: integer("quantity").notNull(),
  priceKobo: integer("price_kobo").notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  paystackReference: text("paystack_reference").notNull(),
  amountKobo: integer("amount_kobo").notNull(),
  feeKobo: integer("fee_kobo").notNull(), // our 5%
  sellerKobo: integer("seller_kobo").notNull(),
  status: paymentStatus("status").notNull().default("pending"),
  releaseAt: timestamp("release_at", { withTimezone: true }), // delivery day + 48h
  releasedAt: timestamp("released_at", { withTimezone: true }),
  refundedKobo: integer("refunded_kobo").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("payments_ref_idx").on(t.paystackReference), index("payments_release_idx").on(t.status, t.releaseAt)]);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  stars: smallint("stars").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  text: text("text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("reviews_order_idx").on(t.orderId), index("reviews_shop_idx").on(t.shopId)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("notifications_user_idx").on(t.userId, t.read)]);
