"use server";

import { z } from "zod";
import { and, asc, eq, inArray, notExists } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { categorizeRules, items, listDishes } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getAccessibleList } from "@/lib/queries/lists";
import { ingestText } from "@/lib/items/ingest";
import { CATEGORY_KEYS } from "@/lib/categories";
import { parseInput } from "@/lib/parse";
import { translateName } from "@/lib/i18n/translate";
import { dishSnapshot, itemSnapshot, removalToken, sectionDishIds } from "@/lib/items/removal";
import { MAX_ADD } from "@/lib/items/board";
import { CLIENT_ID_RE } from "@/lib/ids";
import { getLang } from "@/lib/i18n/server";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

/**
 * The item and its list when the caller may touch it. A row someone else already removed is
 * an answer, not a crash: null (the caller returns { ok: false, error: "gone" } and the list
 * refreshes). Another list's item is still refused outright.
 */
async function itemIfThere(userId: string, itemId: string) {
  const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!item) return null;
  const list = await getAccessibleList(userId, item.listId);
  if (!list) throw new Error("Forbidden");
  return { item, list };
}

const gone = () => {
  revalidatePath("/");
  return { ok: false as const, error: "gone" as const };
};

const addSchema = z.object({
  listId: z.string().min(1),
  text: z.string().min(1).max(2000),
  ids: z.array(z.string().regex(CLIENT_ID_RE)).max(MAX_ADD).optional(),
});

/**
 * Free-text add to a list the caller can access. Recipe detection, parsing,
 * categorizing and merging all live in the shared ingestText() core (also used
 * by the Siri webhook).
 */
export async function addItems(input: z.infer<typeof addSchema>) {
  const { listId, text, ids } = addSchema.parse(input);
  const user = await requireUser();
  const list = await getAccessibleList(user.id, listId);
  if (!list) throw new Error("List not found");

  const result = await ingestText({ list, text, addedByUserId: user.id, lang: await getLang(), ids });
  revalidatePath("/");
  return result;
}

/**
 * Tick or untick: the caller says which (so two people ticking the same item both get
 * "bought" — a flip would undo the other's tick). Repeating it changes nothing.
 */
export async function toggleItem(input: { itemId: string; checked: boolean }) {
  const { itemId, checked } = z.object({ itemId: z.string().min(1), checked: z.boolean() }).parse(input);
  const user = await requireUser();
  const found = await itemIfThere(user.id, itemId);
  if (!found) return gone();
  if (found.item.checked !== checked) {
    await db
      .update(items)
      .set({ checked, checkedAt: checked ? new Date() : null, updatedAt: new Date() })
      .where(eq(items.id, itemId));
  }
  revalidatePath("/");
  return { ok: true as const, checked };
}

export async function moveItem(input: { itemId: string; categoryKey: string }) {
  const { itemId, categoryKey } = z
    .object({
      itemId: z.string().min(1),
      categoryKey: z.enum(CATEGORY_KEYS as [string, ...string[]]),
    })
    .parse(input);
  const user = await requireUser();
  const found = await itemIfThere(user.id, itemId);
  if (!found) return gone();
  const { item, list } = found;

  await db
    .update(items)
    .set({ categoryKey, updatedAt: new Date() })
    .where(eq(items.id, itemId));

  // Learn the correction so it auto-sorts next time.
  await db
    .insert(categorizeRules)
    .values({ ownerId: list.ownerId, normalizedName: item.normalizedName, categoryKey })
    .onConflictDoUpdate({
      target: [categorizeRules.ownerId, categorizeRules.normalizedName],
      set: { categoryKey },
    });

  revalidatePath("/");
  return { ok: true as const };
}

/** Delete one item; the returned token (Undo toast) puts it back exactly as it was. */
export async function deleteItem(input: { itemId: string }) {
  const { itemId } = z.object({ itemId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  const found = await itemIfThere(user.id, itemId);
  if (!found) return gone(); // someone else was faster — nothing to undo
  const { list } = found;
  const removed = await db.delete(items).where(eq(items.id, itemId)).returning(itemSnapshot);
  revalidatePath("/");
  return {
    ok: true as const,
    undo: removalToken(user.id, list.id, {
      items: removed,
      dishes: [],
      sectionIds: await sectionDishIds(list.id, removed),
    }),
  };
}

/**
 * Remove everything bought. A dish whose every ingredient was bought goes with it (it's done);
 * a dish that was already empty (just created) stays. Undo-able like any removal.
 */
export async function clearChecked(input: { listId: string }) {
  const { listId } = z.object({ listId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  const list = await getAccessibleList(user.id, listId);
  if (!list) throw new Error("List not found");
  const removed = await db.transaction(async (tx) => {
    // Dish rows first, like removeDish / renameDish / addToDish (dish → items everywhere, so no
    // deadlock). An add to a dish that is already running finishes first, and the statements
    // below see its new rows — so a dish that just got an ingredient is not cleared away.
    await tx
      .select({ id: listDishes.id })
      .from(listDishes)
      .where(eq(listDishes.listId, listId))
      .orderBy(asc(listDishes.id))
      .for("update");
    const bought = await tx
      .delete(items)
      .where(and(eq(items.listId, listId), eq(items.checked, true)))
      .returning(itemSnapshot);
    const touched = [...new Set(bought.map((i) => i.section).filter((s): s is string => !!s))];
    const sectionIds = await sectionDishIds(listId, bought, tx);
    const dishes =
      touched.length === 0
        ? []
        : await tx
            .delete(listDishes)
            .where(
              and(
                eq(listDishes.listId, listId),
                inArray(listDishes.name, touched),
                notExists(
                  tx
                    .select({ id: items.id })
                    .from(items)
                    .where(and(eq(items.listId, listId), eq(items.section, listDishes.name))),
                ),
              ),
            )
            .returning(dishSnapshot);
    return { items: bought, dishes, sectionIds };
  });
  revalidatePath("/");
  return {
    undo: removalToken(user.id, list.id, removed),
    items: removed.items.length,
    dishes: removed.dishes.length,
  };
}

/**
 * Edit an item from its menu: "2kg batatas" style text (qty optional). Re-parses,
 * keeps the item's aisle and dish, and refreshes both translations.
 */
export async function editItem(input: { itemId: string; text: string }) {
  const { itemId, text } = z
    .object({ itemId: z.string().min(1), text: z.string().trim().min(1).max(200) })
    .parse(input);
  const user = await requireUser();
  if (!(await itemIfThere(user.id, itemId))) return gone();
  const [p] = parseInput(text);
  if (!p) throw new Error("Nothing to save");
  const names = await translateName(p.name, await getLang());
  await db
    .update(items)
    .set({
      name: p.name,
      normalizedName: p.normalizedName,
      qty: p.qty,
      unit: p.unit,
      nameEn: names.en,
      namePt: names.pt,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Put an item under another dish of the same list (null = no dish). The dish is named by id,
 * so a dish renamed or removed by someone else meanwhile is never recreated under an old name.
 */
export async function setItemDish(input: { itemId: string; dishId: string | null }) {
  const { itemId, dishId } = z
    .object({ itemId: z.string().min(1), dishId: z.string().min(1).max(64).nullable() })
    .parse(input);
  const user = await requireUser();
  const found = await itemIfThere(user.id, itemId);
  if (!found) return gone();
  const { list } = found;
  const done = await db.transaction(async (tx) => {
    let section: string | null = null;
    if (dishId) {
      const [d] = await tx
        .select({ name: listDishes.name })
        .from(listDishes)
        .where(and(eq(listDishes.id, dishId), eq(listDishes.listId, list.id)))
        .for("update");
      if (!d) return false;
      section = d.name;
    }
    await tx.update(items).set({ section, updatedAt: new Date() }).where(eq(items.id, itemId));
    return true;
  });
  revalidatePath("/");
  return done ? { ok: true as const } : { ok: false as const, error: "dish-gone" as const };
}
