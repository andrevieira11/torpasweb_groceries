"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChefHat, Plus } from "lucide-react";
import { addRecipeAsDish } from "@/lib/actions/recipes";
import { fill, ingredientCount, VIEW_COOKIE } from "@/lib/i18n/strings";
import { dishDomId } from "./board/BoardProvider";
import { useLang, useT } from "./LangProvider";
import { useToast } from "./Toast";

/**
 * A recipe in the Recipes tab: tap the name to edit it; "＋ Dish" puts its ingredients on the open
 * list as a dish. Once it is there (`dishId`, known by the server — so also after a reload and
 * on the other person's phone) the button becomes "✓ On list" and opens that dish; adding it a
 * second time (which doubles every quantity) is its own, explicit button.
 */
export function RecipeCard({
  id,
  name,
  count,
  dishId: initialDish,
}: {
  id: string;
  name: string;
  count: number;
  dishId: string | null;
}) {
  const router = useRouter();
  const tr = useT();
  const lang = useLang();
  const toast = useToast();
  const [dishId, setDishId] = useState(initialDish);
  const [pending, startTransition] = useTransition();

  function openDish(target: string | null) {
    document.cookie = `${VIEW_COOKIE}=dish; path=/; max-age=31536000; samesite=lax`;
    router.push(target ? `/#${dishDomId(target)}` : "/");
  }

  function add() {
    startTransition(async () => {
      try {
        const r = await addRecipeAsDish({ recipeId: id });
        setDishId(r.dishId);
        toast({
          message: fill(tr("addedAsDish"), { name: r.dish }),
          action: { label: tr("open"), icon: "open", run: () => openDish(r.dishId) },
        });
      } catch {
        toast({ message: tr("couldNotSave") });
      }
    });
  }

  return (
    <div className="flex flex-col rounded-2xl border border-hairline bg-surface p-1.5 pl-3">
      <div className="flex items-center gap-2">
        <Link
          href={`/recipes/${id}`}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl py-1 transition-colors"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
            <ChefHat className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug">{name}</span>
            <span className="block text-xs text-muted">{ingredientCount(lang, count)}</span>
          </span>
        </Link>
        {dishId ? (
          <button
            type="button"
            onClick={() => openDish(dishId)}
            aria-label={fill(tr("openDishFor"), { name })}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-3.5 text-sm font-semibold text-fg"
          >
            <Check className="size-4" strokeWidth={2.6} aria-hidden />
            {tr("onList")}
          </button>
        ) : (
          <button
            type="button"
            onClick={add}
            disabled={pending}
            aria-label={fill(tr("addAsDishFor"), { name })}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-brand px-3.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="size-4" strokeWidth={2.6} aria-hidden />
            {tr("dishShort")}
          </button>
        )}
      </div>
      {dishId && (
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="flex min-h-11 items-center gap-1 self-end rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-60"
        >
          <Plus className="size-4" strokeWidth={2.4} aria-hidden />
          {tr("addAgain")}
        </button>
      )}
    </div>
  );
}
