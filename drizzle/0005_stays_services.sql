CREATE TYPE "public"."price_type" AS ENUM('fixed', 'quote');--> statement-breakpoint
CREATE TYPE "public"."product_kind" AS ENUM('item', 'stay', 'service');--> statement-breakpoint
ALTER TYPE "public"."delivery_method" ADD VALUE 'check_in';--> statement-breakpoint
ALTER TYPE "public"."delivery_method" ADD VALUE 'visit';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'requested';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'quoted';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "check_out" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guests" smallint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "check_in_info" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "time_slot" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quote_note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quoted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "kind" "product_kind" DEFAULT 'item' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "guests" smallint;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "bedrooms" smallint;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "bathrooms" smallint;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "amenities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "check_in_time" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "check_out_time" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "min_nights" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rules" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "private_address" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "blocked_dates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_type" "price_type" DEFAULT 'fixed' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_unit" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "service_areas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "work_days" jsonb DEFAULT '[1,2,3,4,5,6]'::jsonb NOT NULL;