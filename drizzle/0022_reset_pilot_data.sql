-- One-time cleanup before launch: remove all test shops, listings, orders and accounts. Keeps only Nephi's account.
TRUNCATE TABLE "order_items", "payments", "reviews", "orders", "waitlist", "saved_shops", "discount_codes", "collections", "delivery_settings", "products", "shops", "photos", "files", "notifications", "ai_cache", "ai_usage", "otp_codes" RESTART IDENTITY CASCADE;--> statement-breakpoint
DELETE FROM "users" WHERE lower(coalesce("email", '')) <> 'nephiasha2017@gmail.com';
