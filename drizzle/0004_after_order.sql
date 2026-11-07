ALTER TABLE "orders" ADD COLUMN "auto_closed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "problem" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "problem_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "problem_resolution" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "paid_out_at" timestamp with time zone;