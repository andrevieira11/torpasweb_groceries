"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChefHat, Plus } from "lucide-react";
import { addRecipeToList } from "@/lib/actions/recipes";

export function RecipeCard({
  id,
  name,
  count,
}: {
  id: string;
  name: string;
  count: number;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  function add(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addRecipeToList({ recipeId: id });
      setAdded(true);
      router.refresh();
    });
  }

  return (
    <Link
      href={`/recipes/${id}`}
      className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-3 transition-colors hover:bg-surface-2"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
        <ChefHat className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{name}</span>
        <span className="text-xs text-muted">
          {count} {count === 1 ? "ingredient" : "ingredients"}
        </span>
      </span>
      <button
        type="button"
        onClick={add}
        disabled={pending || added}
        aria-label={`Add ${name} to list`}
        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
          added ? "bg-good/15 text-good" : "bg-brand text-white hover:opacity-90"
        } disabled:opacity-70`}
      >
        {added ? <Check className="size-4" strokeWidth={2.6} /> : <Plus className="size-4" strokeWidth={2.6} />}
        {added ? "Added" : "Add"}
      </button>
    </Link>
  );
}
