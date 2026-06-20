import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getRecipesWithCounts } from "@/lib/queries/recipes";
import { RecipeCard } from "@/components/RecipeCard";

export const metadata: Metadata = { title: "Recipes" };

export default async function RecipesPage() {
  const session = await requireSession();
  const recipes = await getRecipesWithCounts(session.user.id);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Recipes</h1>
        <Link
          href="/recipes/new"
          className="flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          New
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="mt-2 flex flex-col items-center gap-3 rounded-3xl border border-hairline bg-surface px-6 py-14 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
            <BookOpen className="size-7" />
          </div>
          <p className="text-base font-medium">No recipes yet</p>
          <p className="max-w-[18rem] text-sm text-muted">
            Save a recipe once, then add all its ingredients to your list with one
            line — &ldquo;add meatloaf&rdquo;.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((r) => (
            <li key={r.id}>
              <RecipeCard id={r.id} name={r.name} count={r.count} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
