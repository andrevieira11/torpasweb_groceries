import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { recipeIngredients, recipes } from "@/db/schema";

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
