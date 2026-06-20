import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Recipes" };

export default function RecipesPage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Recipes</h1>

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-hairline bg-surface px-6 py-14 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
          <BookOpen className="size-7" />
        </div>
        <p className="text-base font-medium">No recipes yet</p>
        <p className="max-w-[18rem] text-sm text-muted">
          Save a recipe once, then add all its ingredients to your list with one
          line — &ldquo;add meatloaf&rdquo;.
        </p>
      </div>
    </section>
  );
}
