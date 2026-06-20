import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { RecipeForm } from "@/components/RecipeForm";

export const metadata: Metadata = { title: "New recipe" };

export default async function NewRecipePage() {
  await requireSession();
  return <RecipeForm />;
}
