ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;
--> statement-breakpoint
-- Everyone who joined before this proved their phone with an SMS code.
UPDATE "users" SET "phone_verified_at" = "created_at" WHERE "is_guest" = false;
