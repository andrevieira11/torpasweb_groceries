"use server";

import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { categorizeRules, items, listDishes, recipeIngredients, recipes } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getAccessibleList } from "@/lib/queries/lists";
import { applyPrepared, ensureDish, prepareItems, type Tx } from "@/lib/items/add";
import { dishSnapshot, itemSnapshot, removalToken, restoreFromToken } from "@/lib/items/removal";
import { canonicalDish, cleanSection, sameDish } from "@/lib/items/sections";
import { DISH_EMOJIS } from "@/lib/items/dish-emoji";
import { MAX_ADD } from "@/lib/items/board";
import { CLIENT_ID_RE } from "@/lib/ids";
import { getLang } from "@/lib/i18n/server";
import { categorize, cleanDisplayName, normalizeName, parseInput } from "@/lib/parse";

/**
 * Dishes = named sections of a list (items.section) + their list_dishes row. Every action is
 * zod-validated and gated by getAccessibleList (owner or member), like the item actions.
 *
 * The buttons on a dish card name it by its list_dishes id, never by its name: if someone else
 * renamed or removed it meanwhile, the action works on the dish as it is now — or answers
 * { ok: false, error: "gone" } — instead of quietly recreating a dish under an old name. Only
 * free text ("Lunch: cod" in the add box, Siri) creates dishes by name. Each action takes the
 * dish row FOR UPDATE first, so a rename and an add on the same dish run one after the other.
 */

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

async function listFor(userId: string, listId: string) {
  const list = await getAccessibleList(userId, listId);
  if (!list) throw new Error("List not found");
  return list;
}

/** The dish as it is now, locked for this transaction; undefined when it is gone. */
async function lockDish(tx: Tx, listId: string, dishId: string) {
  const [d] = await tx
    .select()
    .from(listDishes)
    .where(and(eq(listDishes.id, dishId), eq(listDishes.listId, listId)))
    .for("update");
  return d;
}

const GONE = { ok: false as const, error: "gone" as const };

const listId = z.string().min(1);
const dishId = z.string().min(1).max(64);
const dishName = z.string().trim().min(1).max(40);
const emoji = z.union([z.enum(DISH_EMOJIS), z.literal("")]).nullable();
const ids = z.array(z.string().regex(CLIENT_ID_RE)).max(MAX_ADD).optional();
const text = z.string().max(2000);

/** Parse → categorize (the owner's learned rules win) → translations looked up (outside any lock). */
async function prepareText(list: { ownerId: string }, input: string, rowIds: string[] | undefined) {
  const parsed = parseInput(input).slice(0, MAX_ADD);
  if (parsed.length === 0) return null;
  const rules = await db
    .select()
    .from(categorizeRules)
    .where(eq(categorizeRules.ownerId, list.ownerId));
  const learned = new Map(rules.map((r) => [r.normalizedName, r.categoryKey]));
  return prepareItems(
    parsed.map((p, n) => ({
      id: rowIds?.[n],
      name: p.name,
      normalizedName: p.normalizedName,
      qty: p.qty,
      unit: p.unit,
      categoryKey: categorize(p.name, learned),
    })),
    await getLang(),
  );
}

/**
 * "200 g bacon, natas" typed in a card's add row: into that dish (`dishId`), or with no dish
 * (`dishId: null`, the "No dish" card). No recipe expansion — the add row does what it says.
 */
export async function addToDish(input: { listId: string; dishId: string | null; text: string; ids?: string[] }) {
  const p = z.object({ listId, dishId: dishId.nullable(), text: text.min(1), ids }).parse(input);
  const user = await requireUser();
  const list = await listFor(user.id, p.listId);
  const prepared = await prepareText(list, p.text, p.ids);
  if (!prepared) return { ok: true as const, added: 0, merged: 0 };
  const res = await db.transaction(async (tx) => {
    let section: string | null = null;
    if (p.dishId) {
      const d = await lockDish(tx, list.id, p.dishId);
      if (!d) return null;
      section = d.name;
    }
    return applyPrepared(tx, list.id, prepared, user.id, null, section);
  });
  revalidatePath("/");
  return res ? { ok: true as const, ...res } : GONE;
}

/**
 * New dish from the sheet, with the browser's id for it (so the card it already shows keeps
 * its identity). A name that already exists adds to that dish instead.
 */
export async function createDish(input: {
  listId: string;
  id: string;
  name: string;
  emoji: string | null;
  text: string;
  ids?: string[];
}) {
  const p = z.object({ listId, id: z.string().regex(CLIENT_ID_RE), name: dishName, emoji, text, ids }).parse(input);
  const user = await requireUser();
  const list = await listFor(user.id, p.listId);
  const prepared = p.text.trim() ? await prepareText(list, p.text, p.ids) : null;
  const out = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: listDishes.id, name: listDishes.name })
      .from(listDishes)
      .where(eq(listDishes.listId, list.id));
    const name = canonicalDish(p.name, existing.map((d) => d.name))!;
    const existed = existing.some((d) => d.name === name);
    if (!existed) await ensureDish(tx, list.id, name, p.emoji, p.id);
    // The row as saved. A browser id that is already taken (another dish of this or another
    // list) made the insert a no-op: then the dish gets an id of the server's own.
    const saved = () =>
      tx
        .select({ id: listDishes.id, name: listDishes.name })
        .from(listDishes)
        .where(and(eq(listDishes.listId, list.id), eq(listDishes.name, name)))
        .for("update");
    let [d] = await saved();
    if (!d) {
      await ensureDish(tx, list.id, name, p.emoji);
      [d] = await saved();
    }
    if (prepared) await applyPrepared(tx, list.id, prepared, user.id, null, d.name);
    return { id: d.id, name: d.name, existed };
  });
  revalidatePath("/");
  return out;
}

/** Rename and/or change the emoji. Refuses a name another dish of the list already has. */
export async function renameDish(input: { listId: string; dishId: string; to: string; emoji: string | null }) {
  const p = z.object({ listId, dishId, to: dishName, emoji }).parse(input);
  const user = await requireUser();
  const list = await listFor(user.id, p.listId);
  const to = cleanSection(p.to)!;

  const res = await db.transaction(async (tx) => {
    const d = await lockDish(tx, list.id, p.dishId);
    if (!d) return GONE;
    const others = await tx
      .select({ name: listDishes.name })
      .from(listDishes)
      .where(eq(listDishes.listId, list.id));
    if (others.some((o) => o.name !== d.name && sameDish(o.name, to))) {
      return { ok: false as const, error: "exists" as const };
    }
    const now = new Date();
    await tx.update(listDishes).set({ name: to, emoji: p.emoji, updatedAt: now }).where(eq(listDishes.id, d.id));
    if (to !== d.name) {
      await tx
        .update(items)
        .set({ section: to, updatedAt: now })
        .where(and(eq(items.listId, list.id), eq(items.section, d.name)));
    }
    return { ok: true as const, name: to };
  });
  revalidatePath("/");
  return res;
}

/** Remove a dish and its ingredients in one go; the token undoes it. */
export async function removeDish(input: { listId: string; dishId: string }) {
  const p = z.object({ listId, dishId }).parse(input);
  const user = await requireUser();
  const list = await listFor(user.id, p.listId);
  const removed = await db.transaction(async (tx) => {
    const d = await lockDish(tx, list.id, p.dishId);
    if (!d) return null;
    return {
      items: await tx
        .delete(items)
        .where(and(eq(items.listId, list.id), eq(items.section, d.name)))
        .returning(itemSnapshot),
      dishes: await tx.delete(listDishes).where(eq(listDishes.id, d.id)).returning(dishSnapshot),
    };
  });
  revalidatePath("/");
  if (!removed) return GONE;
  return { ok: true as const, undo: removalToken(user.id, list.id, removed) };
}

/**
 * Save the dish's ingredients as the signed-in user's recipe of the same name — replacing that
 * recipe's ingredients when it already exists (the menu labels it "Update recipe" then).
 */
export async function saveDishAsRecipe(input: { listId: string; dishId: string }) {
  const p = z.object({ listId, dishId }).parse(input);
  const user = await requireUser();
  const list = await listFor(user.id, p.listId);
  const [dish] = await db
    .select({ name: listDishes.name })
    .from(listDishes)
    .where(and(eq(listDishes.id, p.dishId), eq(listDishes.listId, list.id)));
  if (!dish) return GONE;
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.listId, list.id), eq(items.section, dish.name)))
    .orderBy(asc(items.createdAt), asc(items.sortOrder), asc(items.id));

  const name = cleanDisplayName(dish.name);
  const normalizedName = normalizeName(name);
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.ownerId, user.id), eq(recipes.normalizedName, normalizedName)))
      .limit(1);
    let id: string;
    if (existing) {
      id = existing.id;
      await tx.update(recipes).set({ name, updatedAt: new Date() }).where(eq(recipes.id, id));
      await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
    } else {
      const [created] = await tx
        .insert(recipes)
        .values({ ownerId: user.id, name, normalizedName })
        .returning({ id: recipes.id });
      id = created.id;
    }
    if (rows.length > 0) {
      await tx.insert(recipeIngredients).values(
        rows.map((r, i) => ({
          recipeId: id,
          name: r.name,
          normalizedName: r.normalizedName,
          qty: r.qty,
          unit: r.unit,
          categoryKey: r.categoryKey,
          sortOrder: i,
        })),
      );
    }
    return { id, created: !existing, count: rows.length, name };
  });
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${result.id}`);
  return { ok: true as const, ...result };
}

/** Undo for any removal (an ingredient, a dish, "Clear done"). */
export async function restoreRemoved(input: { token: string }) {
  const { token } = z.object({ token: z.string().min(10).max(900_000) }).parse(input);
  const user = await requireUser();
  const ok = await restoreFromToken(user.id, token);
  revalidatePath("/");
  return { ok };
}
