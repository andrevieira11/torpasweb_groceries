"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { categorizeRules, items } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getAccessibleList } from "@/lib/queries/lists";
import { parseInput, categorize } from "@/lib/parse";
import { mergeQuantities } from "@/lib/quantity";
import { CATEGORY_KEYS } from "@/lib/categories";

const MAX_ITEMS_PER_ADD = 50;

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

/** Load the item and assert the caller can access its list. */
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

/** Parse free text, categorize (with learned rules), merge compatible dupes. */
export async function addItems(input: z.infer<typeof addSchema>) {
  const { listId, text } = addSchema.parse(input);
  const user = await requireUser();
  const list = await getAccessibleList(user.id, listId);
  if (!list) throw new Error("List not found");

  const parsed = parseInput(text).slice(0, MAX_ITEMS_PER_ADD);
  if (parsed.length === 0) return { added: 0 };

  const rules = await db
    .select()
    .from(categorizeRules)
    .where(eq(categorizeRules.ownerId, list.ownerId));
  const learned = new Map(rules.map((r) => [r.normalizedName, r.categoryKey]));

  const existing = await db
    .select()
    .from(items)
    .where(and(eq(items.listId, listId), eq(items.checked, false)));
  const byNorm = new Map(existing.map((it) => [it.normalizedName, it]));

  let added = 0;
  for (const p of parsed) {
    const category = categorize(p.name, learned);
    const prev = byNorm.get(p.normalizedName);

    if (prev) {
      const merged = mergeQuantities(
        { qty: prev.qty, unit: prev.unit },
        { qty: p.qty, unit: p.unit },
      );
      if (merged) {
        await db
          .update(items)
          .set({ qty: merged.qty, unit: merged.unit, updatedAt: new Date() })
          .where(eq(items.id, prev.id));
        continue;
      }
    }

    const [inserted] = await db
      .insert(items)
      .values({
        listId,
        name: p.name,
        normalizedName: p.normalizedName,
        qty: p.qty,
        unit: p.unit,
        categoryKey: category,
        addedByUserId: user.id,
      })
      .returning();
    byNorm.set(p.normalizedName, inserted);
    added++;
  }

  revalidatePath("/");
  return { added };
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

  // Learn the correction: teach the list's memory so it auto-sorts next time.
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
