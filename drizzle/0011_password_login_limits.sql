ALTER TABLE "users" ADD COLUMN "password_failed_count" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_locked_until" timestamp with time zone;