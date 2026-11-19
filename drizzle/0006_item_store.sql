CREATE TABLE "store_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"normalized_name" text NOT NULL,
	"store" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "store" text DEFAULT 'grocery' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_rules" ADD CONSTRAINT "store_rules_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_rules_owner_norm_idx" ON "store_rules" USING btree ("owner_id","normalized_name");