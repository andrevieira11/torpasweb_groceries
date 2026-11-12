"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { categorizeRules, items } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getAccessibleList } from "@/lib/queries/lists";
import { ingestText } from "@/lib/items/ingest";
import { CATEGORY_KEYS } from "@/lib/categories";
import { parseInput } from "@/lib/parse";
import { translateName } from "@/lib/i18n/translate";
import { cleanSection } from "@/lib/items/sections";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

async function itemWithAccess(userId: string, itemId: string) {
  const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!item) throw new Error("Item not found");
  const list = await getAccessibleList(userId, item.listId);
  if (!list) throw new Error("Forbidden");
  return { item, list };
}

const addSchema = z.object({
  listId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

/**
 * Free-text add to a list the caller can access. Recipe detection, parsing,
 * categorizing and merging all live in the shared ingestText() core (also used
 * by the Siri webhook).
 */
export async function addItems(input: z.infer<typeof addSchema>) {
  const { listId, text } = addSchema.parse(input);
  const user = await requireUser();
  const list = await getAccessibleList(user.id, listId);
  if (!list) throw new Error("List not found");

  const result = await ingestText({ list, text, addedByUserId: user.id });
  revalidatePath("/");
  return result;
}

export async function toggleItem(input: { itemId: string }) {
  const { itemId } = z.object({ itemId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  const { item } = await itemWithAccess(user.id, itemId);

  const checked = !item.checked;
  await db
    .update(items)
    .set({ checked, checkedAt: checked ? new Date() : null, updatedAt: new Date() })
    .where(eq(items.id, itemId));

  revalidatePath("/");
  return { checked };
}

export async function moveItem(input: { itemId: string; categoryKey: string }) {
  const { itemId, categoryKey } = z
    .object({
      itemId: z.string().min(1),
      categoryKey: z.enum(CATEGORY_KEYS as [string, ...string[]]),
    })
    .parse(input);
  const user = await requireUser();
  const { item, list } = await itemWithAccess(user.id, itemId);

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
}

export async function deleteItem(input: { itemId: string }) {
  const { itemId } = z.object({ itemId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  await itemWithAccess(user.id, itemId);
  await db.delete(items).where(eq(items.id, itemId));
  revalidatePath("/");
}

export async function clearChecked(input: { listId: string }) {
  const { listId } = z.object({ listId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  const list = await getAccessibleList(user.id, listId);
  if (!list) throw new Error("List not found");
  await db.delete(items).where(and(eq(items.listId, listId), eq(items.checked, true)));
  revalidatePath("/");
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
  await itemWithAccess(user.id, itemId);
  const [p] = parseInput(text);
  if (!p) throw new Error("Nothing to save");
  const names = await translateName(p.name);
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
}

/** Put an item under another dish/section of the same list (null = no dish). */
export async function setItemSection(input: { itemId: string; section: string | null }) {
  const { itemId, section } = z
    .object({ itemId: z.string().min(1), section: z.string().max(40).nullable() })
    .parse(input);
  const user = await requireUser();
  await itemWithAccess(user.id, itemId);
  await db
    .update(items)
    .set({ section: cleanSection(section), updatedAt: new Date() })
    .where(eq(items.id, itemId));
  revalidatePath("/");
}
