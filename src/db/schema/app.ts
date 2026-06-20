import {
  pgTable,
  text,
  boolean,
  timestamp,
  doublePrecision,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { user } from "./auth";

/**
 * Domain tables. Tenant = List: every item/share is scoped by `list_id`.
 * Item identity (for merge / categorize / learn) is `normalized_name`.
 */

export const categories = pgTable("categories", {
  key: text("key").primaryKey(), // stable: produce, dairy, meat_fish, ...
  label: text("label").notNull(),
  color: text("color").notNull(), // one of the 5 --cat-* palette tokens
  icon: text("icon").notNull(), // lucide-react component name
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lists = pgTable(
  "lists",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isDefault: boolean("is_default").notNull().default(false), // target for Siri ingest
    expiresAt: timestamp("expires_at", { withTimezone: true }), // temporary / trip lists
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lists_owner_idx").on(t.ownerId)],
);

export const listMembers = pgTable(
  "list_members",
  {
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.listId, t.userId] }),
    index("list_members_user_idx").on(t.userId),
  ],
);

/** Guest access: anyone with the link gets that one list, add/view/check only. */
export const listShareTokens = pgTable(
  "list_share_tokens",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("share_tokens_list_idx").on(t.listId)],
);

export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // display name, as cleaned
    normalizedName: text("normalized_name").notNull(), // identity key
    qty: doublePrecision("qty"), // nullable; never silently dropped
    unit: text("unit"), // kg, g, l, ml, x (count) ...
    categoryKey: text("category_key")
      .notNull()
      .default("other")
      .references(() => categories.key),
    checked: boolean("checked").notNull().default(false),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    addedByUserId: text("added_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    addedByName: text("added_by_name"), // guest display name (no account)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("items_list_idx").on(t.listId),
    index("items_list_norm_idx").on(t.listId, t.normalizedName), // merge within a list
  ],
);

export const recipes = pgTable(
  "recipes",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(), // fuzzy "add <recipe>" match
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recipes_owner_idx").on(t.ownerId),
    index("recipes_owner_norm_idx").on(t.ownerId, t.normalizedName),
  ],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    qty: doublePrecision("qty"),
    unit: text("unit"),
    categoryKey: text("category_key")
      .notNull()
      .default("other")
      .references(() => categories.key),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("recipe_ing_recipe_idx").on(t.recipeId)],
);

/** Learned categorization: a user's manual move teaches the next auto-sort. */
export const categorizeRules = pgTable(
  "categorize_rules",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "cascade" }), // null = global
    normalizedName: text("normalized_name").notNull(),
    categoryKey: text("category_key")
      .notNull()
      .references(() => categories.key),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categorize_rules_owner_norm_idx").on(t.ownerId, t.normalizedName)],
);
