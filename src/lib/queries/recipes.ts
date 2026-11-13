import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { recipeIngredients, recipes, user } from "@/db/schema";
import { ingredientLine } from "@/lib/recipes/lines";

/** Lightweight refs for fuzzy "add <recipe>" matching. */
export async function getRecipeRefs(ownerId: string) {
  return db
    .select({
      id: recipes.id,
      name: recipes.name,
      normalizedName: recipes.normalizedName,
    })
    .from(recipes)
    .where(eq(recipes.ownerId, ownerId));
}

/** Recipe list with ingredient counts, for the Recipes tab. */
export async function getRecipesWithCounts(ownerId: string) {
  return db
    .select({
      id: recipes.id,
      name: recipes.name,
      count: sql<number>`count(${recipeIngredients.id})`.mapWith(Number),
    })
    .from(recipes)
    .leftJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
    .where(eq(recipes.ownerId, ownerId))
    .groupBy(recipes.id)
    .orderBy(asc(recipes.name));
}

/** A recipe and its ingredients, scoped to the owner. Null if not theirs. */
export async function getRecipe(ownerId: string, id: string) {
  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.ownerId, ownerId)))
    .limit(1);
  if (!recipe) return null;

  const ingredients = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, id))
    .orderBy(asc(recipeIngredients.sortOrder));

  return { recipe, ingredients };
}

/**
 * Every recipe of the given people (the people on a list: read-only for everyone but the
 * owner) with its ingredients as editable lines ("200 g bacon"), in one query — the New dish
 * sheet's "Start from a recipe" fills from this without a round trip.
 */
export async function getRecipesWithLines(ownerIds: string[]) {
  if (ownerIds.length === 0) return [];
  const rows = await db
    .select({
      id: recipes.id,
      name: recipes.name,
      ownerId: recipes.ownerId,
      ownerName: user.name,
      ingName: recipeIngredients.name,
      qty: recipeIngredients.qty,
      unit: recipeIngredients.unit,
    })
    .from(recipes)
    .innerJoin(user, eq(user.id, recipes.ownerId))
    .leftJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
    .where(inArray(recipes.ownerId, ownerIds))
    .orderBy(asc(recipes.name), asc(recipes.id), asc(recipeIngredients.sortOrder));

  const out: { id: string; name: string; ownerId: string; ownerName: string; lines: string[] }[] = [];
  for (const r of rows) {
    let cur = out[out.length - 1];
    if (!cur || cur.id !== r.id) {
      out.push((cur = { id: r.id, name: r.name, ownerId: r.ownerId, ownerName: r.ownerName, lines: [] }));
    }
    if (r.ingName) cur.lines.push(ingredientLine({ name: r.ingName, qty: r.qty, unit: r.unit }));
  }
  return out;
}
