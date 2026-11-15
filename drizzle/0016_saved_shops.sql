CREATE TABLE "saved_shops" (
	"user_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_shops_user_id_shop_id_pk" PRIMARY KEY("user_id","shop_id")
);
--> statement-breakpoint
ALTER TABLE "saved_shops" ADD CONSTRAINT "saved_shops_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_shops" ADD CONSTRAINT "saved_shops_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_shops_user_idx" ON "saved_shops" USING btree ("user_id","created_at");