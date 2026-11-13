"use server";

import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { listDishes, recipeIngredients, recipes } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getActiveList } from "@/lib/queries/lists";
import { canonicalDish } from "@/lib/items/sections";
import { applyItems } from "@/lib/items/add";
import { cleanDisplayName, normalizeName } from "@/lib/parse";
import { CATEGORY_KEYS } from "@/lib/categories";
import { getLang } from "@/lib/i18n/server";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

const ingredientSchema = z.object({
  name: z.string().min(1).max(120),
  qty: z.number().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  categoryKey: z.enum(CATEGORY_KEYS as [string, ...string[]]),
});

const recipeSchema = z.object({
  name: z.string().min(1).max(120),
  ingredients: z.array(ingredientSchema).max(100),
});

function ingredientRows(recipeId: string, ingredients: z.infer<typeof ingredientSchema>[]) {
  return ingredients.map((g, i) => ({
    recipeId,
    name: cleanDisplayName(g.name),
    normalizedName: normalizeName(g.name),
    qty: g.qty ?? null,
    unit: g.unit ?? null,
    categoryKey: g.categoryKey,
    sortOrder: i,
  }));
}

export async function createRecipe(input: z.infer<typeof recipeSchema>) {
  const { name, ingredients } = recipeSchema.parse(input);
  const user = await requireUser();

  const [recipe] = await db
    .insert(recipes)
    .values({
      ownerId: user.id,
      name: cleanDisplayName(name),
      normalizedName: normalizeName(name),
    })
    .returning();

  if (ingredients.length > 0) {
    await db.insert(recipeIngredients).values(ingredientRows(recipe.id, ingredients));
  }

  revalidatePath("/recipes");
  return { id: recipe.id };
}

const updateSchema = recipeSchema.extend({ id: z.string().min(1) });

export async function updateRecipe(input: z.infer<typeof updateSchema>) {
  const { id, name, ingredients } = updateSchema.parse(input);
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.ownerId, user.id)))
    .limit(1);
  if (!existing) throw new Error("Recipe not found");

  await db
    .update(recipes)
    .set({
      name: cleanDisplayName(name),
      normalizedName: normalizeName(name),
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, id));

  // Replace ingredients wholesale — simplest correct semantics for an editor.
  await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
  if (ingredients.length > 0) {
    await db.insert(recipeIngredients).values(ingredientRows(id, ingredients));
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}

export async function deleteRecipe(input: { id: string }) {
  const { id } = z.object({ id: z.string().min(1) }).parse(input);
  const user = await requireUser();
  const [existing] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.ownerId, user.id)))
    .limit(1);
  if (!existing) throw new Error("Recipe not found");

  await db.delete(recipes).where(eq(recipes.id, id)); // ingredients cascade
  revalidatePath("/recipes");
}

/**
 * "Add as dish" on the Recipes tab: the recipe's ingredients land in the active list as a dish
 * named after the recipe (merging into that dish if it is already there — adding twice doubles).
 */
export async function addRecipeAsDish(input: { recipeId: string }) {
  const { recipeId } = z.object({ recipeId: z.string().min(1) }).parse(input);
  const user = await requireUser();

  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.ownerId, user.id)))
    .limit(1);
  if (!recipe) throw new Error("Recipe not found");

  const list = await getActiveList(user.id);
  const [ings, dishes] = await Promise.all([
    db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(asc(recipeIngredients.sortOrder)),
    db.select({ name: listDishes.name }).from(listDishes).where(eq(listDishes.listId, list.id)),
  ]);
  const dish = canonicalDish(recipe.name, dishes.map((d) => d.name)) ?? "Recipe";

  const res = await applyItems(
    list.id,
    ings.map((g) => ({
      name: g.name,
      normalizedName: g.normalizedName,
      qty: g.qty,
      unit: g.unit,
      categoryKey: g.categoryKey,
    })),
    user.id,
    null,
    dish,
    await getLang(),
  );
  const [row] = await db
    .select({ id: listDishes.id })
    .from(listDishes)
    .where(and(eq(listDishes.listId, list.id), eq(listDishes.name, dish)));

  revalidatePath("/");
  revalidatePath("/recipes");
  return { ...res, dish, dishId: row?.id ?? null };
}
