import "server-only";
import { and, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { items, listDishes } from "@/db/schema";
import { env } from "@/env";
import { signUndo, verifyUndo } from "@/lib/undo";
import { getAccessibleList } from "@/lib/queries/lists";
import type { Tx } from "./add";

/**
 * What a removal deletes, as `.returning(...)` shapes. created_at also comes back as exact
 * text: a JS Date keeps milliseconds but Postgres stores microseconds, and a restored row
 * must sort back into exactly the same place among the rows of its batch.
 */
export const itemSnapshot = {
  ...getTableColumns(items),
  createdAtExact: sql<string>`${items.createdAt}::text`,
};
export const dishSnapshot = {
  ...getTableColumns(listDishes),
  createdAtExact: sql<string>`${listDishes.createdAt}::text`,
};

type ItemRow = typeof items.$inferSelect & { createdAtExact: string };
type DishRow = typeof listDishes.$inferSelect & { createdAtExact: string };
/**
 * `sectionIds`: the dish id behind each removed item's section at removal time, so Undo puts
 * an item back into its dish even when the dish was renamed meanwhile (not under the old name).
 */
export type Removed = { items: ItemRow[]; dishes: DishRow[]; sectionIds?: Record<string, string> };

/** JSON turned the timestamps into strings. */
type Wire<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K] };
const date = (v: string | null) => (v ? new Date(v) : null);
const exact = (v: string) => sql`${v}::timestamptz`;

/** Section name → dish id for the sections of some removed items. */
export async function sectionDishIds(
  listId: string,
  removed: { section: string | null }[],
  tx: Tx | typeof db = db,
): Promise<Record<string, string>> {
  const names = [...new Set(removed.map((i) => i.section).filter((s): s is string => !!s))];
  if (names.length === 0) return {};
  const rows = await tx
    .select({ id: listDishes.id, name: listDishes.name })
    .from(listDishes)
    .where(and(eq(listDishes.listId, listId), inArray(listDishes.name, names)));
  return Object.fromEntries(rows.map((r) => [r.name, r.id]));
}

/** A signed snapshot of what was just deleted, for the Undo toast (see lib/undo.ts). */
export function removalToken(userId: string, listId: string, removed: Removed): string {
  return signUndo({ uid: userId, listId, data: removed }, env.BETTER_AUTH_SECRET);
}

/**
 * Put back exactly what a removal deleted (same ids, positions, translations, check state).
 * Items go back into their dish under its CURRENT name when it was renamed meanwhile; a dish
 * that is gone comes back with them. False when the token is forged/expired/someone else's or
 * the list is no longer theirs.
 */
export async function restoreFromToken(userId: string, token: string): Promise<boolean> {
  const p = verifyUndo<{ items: Wire<ItemRow>[]; dishes: Wire<DishRow>[]; sectionIds?: Record<string, string> }>(
    token,
    env.BETTER_AUTH_SECRET,
    { uid: userId },
  );
  if (!p) return false;
  const list = await getAccessibleList(userId, p.listId);
  if (!list) return false;

  // Which of those dishes still exist (by id, in this list), and under what name now.
  const idOf = new Map(Object.entries(p.data.sectionIds ?? {}));
  for (const d of p.data.dishes) idOf.set(d.name, d.id);
  const ids = [...new Set(idOf.values())];
  const live =
    ids.length === 0
      ? []
      : await db
          .select({ id: listDishes.id, name: listDishes.name })
          .from(listDishes)
          .where(and(eq(listDishes.listId, list.id), inArray(listDishes.id, ids)));
  const nameNow = new Map(live.map((d) => [d.id, d.name]));
  const current = (section: string | null) => {
    if (!section) return section;
    const id = idOf.get(section);
    return (id && nameNow.get(id)) || section;
  };

  const restoredItems = p.data.items.map(({ createdAtExact, ...i }) => ({
    ...i,
    section: current(i.section),
    listId: list.id,
    checkedAt: date(i.checkedAt),
    createdAt: exact(createdAtExact),
    updatedAt: new Date(),
  }));
  // Dishes that were removed with them, plus any dish an item belongs to (it may be gone now).
  const dishRows = new Map<string, PgInsertValue<typeof listDishes>>();
  for (const { createdAtExact, ...d } of p.data.dishes) {
    if (nameNow.has(d.id)) continue; // already back (an earlier Undo) — maybe renamed since
    dishRows.set(d.name, { ...d, listId: list.id, createdAt: exact(createdAtExact), updatedAt: new Date() });
  }
  for (const i of restoredItems) {
    if (i.section && !dishRows.has(i.section)) dishRows.set(i.section, { listId: list.id, name: i.section });
  }

  await db.transaction(async (tx) => {
    if (dishRows.size > 0) await tx.insert(listDishes).values([...dishRows.values()]).onConflictDoNothing();
    if (restoredItems.length > 0) await tx.insert(items).values(restoredItems).onConflictDoNothing();
  });
  return true;
}
