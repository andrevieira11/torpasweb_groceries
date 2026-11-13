CREATE TABLE "list_dishes" (
	"id" text PRIMARY KEY NOT NULL,
	"list_id" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "list_dishes" ADD CONSTRAINT "list_dishes_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "list_dishes_list_name_idx" ON "list_dishes" USING btree ("list_id","name");--> statement-breakpoint
-- Backfill (2026-11-13): one dish row per section already used by items, created at the
-- section's first item so dishes keep today's order. Additive only; ids are supplied here
-- because cuid2 ids are app-side (see DECISIONS M1).
INSERT INTO "list_dishes" ("id", "list_id", "name", "created_at", "updated_at")
SELECT 'dish_' || md5("list_id" || ':' || "section"), "list_id", "section", min("created_at"), now()
FROM "items"
WHERE "section" IS NOT NULL AND btrim("section") <> ''
GROUP BY "list_id", "section"
ON CONFLICT DO NOTHING;
