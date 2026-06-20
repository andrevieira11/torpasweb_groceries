// Run at container start (before the server): apply pending migrations, then
// idempotently seed the category set. Plain ESM so it runs with bare `node`.
//   CMD sh -c "node scripts/migrate.mjs && node server.js"
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is required");
  process.exit(1);
}

// Keep in sync with src/lib/categories.ts (this file can't import TS).
const CATEGORIES = [
  { key: "produce", label: "Produce", color: "green", icon: "Apple", order: 1 },
  { key: "dairy", label: "Dairy", color: "blue", icon: "Milk", order: 2 },
  { key: "meat_fish", label: "Meat & Fish", color: "red", icon: "Fish", order: 3 },
  { key: "bakery", label: "Bakery", color: "amber", icon: "Croissant", order: 4 },
  { key: "frozen", label: "Frozen", color: "blue", icon: "Snowflake", order: 5 },
  { key: "pantry", label: "Pantry", color: "amber", icon: "Wheat", order: 6 },
  { key: "drinks", label: "Drinks", color: "red", icon: "Wine", order: 7 },
  { key: "household", label: "Household", color: "slate", icon: "SprayCan", order: 8 },
  { key: "other", label: "Other", color: "slate", icon: "ShoppingBasket", order: 99 },
];

const sql = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(sql);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  for (const c of CATEGORIES) {
    await sql`
      insert into categories (key, label, color, icon, sort_order)
      values (${c.key}, ${c.label}, ${c.color}, ${c.icon}, ${c.order})
      on conflict (key) do update set
        label = excluded.label,
        color = excluded.color,
        icon = excluded.icon,
        sort_order = excluded.sort_order
    `;
  }
  console.log(`[migrate] done — migrations applied, ${CATEGORIES.length} categories seeded`);
} catch (err) {
  console.error("[migrate] failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
