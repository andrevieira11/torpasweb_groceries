"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { categorizeRules, items, recipeIngredients } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getAccessibleList } from "@/lib/queries/lists";
import { getRecipeRefs } from "@/lib/queries/recipes";
import { parseInput, categorize, stripCommandPrefix } from "@/lib/parse";
import { matchRecipe } from "@/lib/recipes/match";
import { applyItems } from "@/lib/items/add";
import { CATEGORY_KEYS } from "@/lib/categories";

const MAX_ITEMS_PER_ADD = 50;

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
 * Free-text add. A single phrase matching a saved recipe expands it; otherwise
 * the text is parsed into items, categorized (with learned rules), and merged.
 */
export async function addItems(input: z.infer<typeof addSchema>) {
  const { listId, text } = addSchema.parse(input);
  const user = await requireUser();
  const list = await getAccessibleList(user.id, listId);
  if (!list) throw new Error("List not found");

  const phrase = stripCommandPrefix(text.trim());
  if (phrase && !/[,\n;]/.test(phrase)) {
    const hit = matchRecipe(phrase, await getRecipeRefs(list.ownerId));
    if (hit) {
      const ings = await db
        .select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, hit.id));
      const res = await applyItems(
        listId,
        ings.map((g) => ({
          name: g.name,
          normalizedName: g.normalizedName,
          qty: g.qty,
          unit: g.unit,
          categoryKey: g.categoryKey,
        })),
        user.id,
      );
      revalidatePath("/");
      return { kind: "recipe" as const, recipe: hit.name, ...res };
    }
  }

  const parsed = parseInput(text).slice(0, MAX_ITEMS_PER_ADD);
  if (parsed.length === 0) return { kind: "items" as const, added: 0, merged: 0 };

  const rules = await db
    .select()
    .from(categorizeRules)
    .where(eq(categorizeRules.ownerId, list.ownerId));
  const learned = new Map(rules.map((r) => [r.normalizedName, r.categoryKey]));

  const res = await applyItems(
    listId,
    parsed.map((p) => ({
      name: p.name,
      normalizedName: p.normalizedName,
      qty: p.qty,
      unit: p.unit,
      categoryKey: categorize(p.name, learned),
    })),
    user.id,
  );
  revalidatePath("/");
  return { kind: "items" as const, ...res };
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
