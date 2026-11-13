import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { RecipeForm } from "@/components/RecipeForm";
import { getLang } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await getLang(), "newRecipe") };
}

export default async function NewRecipePage() {
  await requireSession();
  return <RecipeForm />;
}
