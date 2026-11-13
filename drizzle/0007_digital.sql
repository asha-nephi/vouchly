ALTER TYPE "public"."category" ADD VALUE 'learning';--> statement-breakpoint
ALTER TYPE "public"."category" ADD VALUE 'chefs';--> statement-breakpoint
ALTER TYPE "public"."delivery_method" ADD VALUE 'download';--> statement-breakpoint
ALTER TYPE "public"."product_kind" ADD VALUE 'digital';--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"r2_key" text,
	"data" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "downloads" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "file_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;