import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getRecipe } from "@/lib/queries/recipes";
import { RecipeForm } from "@/components/RecipeForm";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const data = await getRecipe(session.user.id, id);
  if (!data) notFound();

  return (
    <RecipeForm
      initial={{
        id: data.recipe.id,
        name: data.recipe.name,
        ingredients: data.ingredients.map((g) => ({
          name: g.name,
          qty: g.qty,
          unit: g.unit,
          categoryKey: g.categoryKey,
        })),
      }}
    />
  );
}
