import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getRecipesWithCounts } from "@/lib/queries/recipes";
import { getActiveList, getListDishes } from "@/lib/queries/lists";
import { canonicalDish } from "@/lib/items/sections";
import { RecipeCard } from "@/components/RecipeCard";
import { getLang } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await getLang(), "recipes") };
}

export default async function RecipesPage() {
  const session = await requireSession();
  const [recipes, lang, active] = await Promise.all([
    getRecipesWithCounts(session.user.id),
    getLang(),
    getActiveList(session.user.id),
  ]);
  // Which recipes are already a dish on the open list (same rule "Add as dish" files under),
  // so the card says so on every device — and doesn't silently double them on a second tap.
  const dishes = await getListDishes(active.id);
  const names = dishes.map((d) => d.name);
  const dishFor = (name: string) => {
    const filed = canonicalDish(name, names);
    return dishes.find((d) => d.name === filed)?.id ?? null;
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t(lang, "recipes")}</h1>
        <Link
          href="/recipes/new"
          className="flex min-h-11 items-center gap-1 rounded-full bg-brand px-4 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          {t(lang, "newShort")}
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="mt-2 flex flex-col items-center gap-3 rounded-3xl border border-hairline bg-surface px-6 py-14 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
            <BookOpen className="size-7" />
          </div>
          <p className="text-base font-medium">{t(lang, "noRecipes")}</p>
          <p className="max-w-[18rem] text-sm text-muted">{t(lang, "noRecipesBody")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((r) => (
            <li key={r.id}>
              <RecipeCard id={r.id} name={r.name} count={r.count} dishId={dishFor(r.name)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
