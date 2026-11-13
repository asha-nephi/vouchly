ALTER TYPE "public"."delivery_method" ADD VALUE 'session';--> statement-breakpoint
ALTER TYPE "public"."delivery_method" ADD VALUE 'event';--> statement-breakpoint
ALTER TYPE "public"."product_kind" ADD VALUE 'session';--> statement-breakpoint
ALTER TYPE "public"."product_kind" ADD VALUE 'event';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "online" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "duration_mins" smallint;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "start_hour" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "end_hour" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seats" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "meeting_link" text;