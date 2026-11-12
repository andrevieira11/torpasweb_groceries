ALTER TABLE "items" ADD COLUMN "name_en" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "name_pt" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "translations" (
	"key" text PRIMARY KEY NOT NULL,
	"en" text NOT NULL,
	"pt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
