CREATE TYPE "public"."seller_type" AS ENUM('service', 'online', 'products');--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "seller_type" "seller_type" DEFAULT 'products' NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "trades" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
-- Existing shops: pick the path from their category.
UPDATE "shops" SET "seller_type" = 'service' WHERE "category" IN ('repairs', 'home_care', 'chefs');--> statement-breakpoint
UPDATE "shops" SET "seller_type" = 'online' WHERE "category" = 'learning';