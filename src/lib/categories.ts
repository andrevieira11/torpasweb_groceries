/**
 * Canonical category set — the single source of truth for the seed
 * (scripts/migrate.mjs) and the UI. Items reference a category by its stable
 * `key` (never re-numbered). Colors are limited to a reused 5-hue palette
 * (--cat-* tokens in globals.css); icons are lucide-react component names.
 */

export type CategoryColor = "green" | "blue" | "red" | "amber" | "slate";

export type CategoryDef = {
  key: string;
  label: string;
  color: CategoryColor;
  icon: string;
  order: number;
};

export const CATEGORIES: readonly CategoryDef[] = [
  { key: "produce", label: "Produce", color: "green", icon: "Apple", order: 1 },
  { key: "dairy", label: "Dairy", color: "blue", icon: "Milk", order: 2 },
  { key: "meat_fish", label: "Meat & Fish", color: "red", icon: "Fish", order: 3 },
  { key: "bakery", label: "Bakery", color: "amber", icon: "Croissant", order: 4 },
  { key: "frozen", label: "Frozen", color: "blue", icon: "Snowflake", order: 5 },
  { key: "pantry", label: "Pantry", color: "amber", icon: "Wheat", order: 6 },
  { key: "drinks", label: "Drinks", color: "red", icon: "Wine", order: 7 },
  { key: "household", label: "Household", color: "slate", icon: "SprayCan", order: 8 },
  { key: "other", label: "Other", color: "slate", icon: "ShoppingBasket", order: 99 },
] as const;

/** Fallback used everywhere an item has no confident category. */
export const FALLBACK_CATEGORY = "other";

const byKey = new Map(CATEGORIES.map((c) => [c.key, c]));

export function getCategory(key: string): CategoryDef {
  return byKey.get(key) ?? byKey.get(FALLBACK_CATEGORY)!;
}

export function isCategoryKey(key: string): boolean {
  return byKey.has(key);
}

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
