import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categorizeRules, recipeIngredients } from "@/db/schema";
import { getRecipeRefs } from "@/lib/queries/recipes";
import { parseInput, categorize, stripCommandPrefix } from "@/lib/parse";
import { matchRecipe } from "@/lib/recipes/match";
import { applyItems } from "./add";
import { cleanSection, splitSections } from "./sections";

const MAX_ITEMS = 50;

export type IngestResult = {
  kind: "recipe" | "items";
  recipe?: string;
  added: number;
  merged: number;
  names: string[];
};

/**
 * Turn free text into list items — the one path shared by the in-app add and the
 * Siri webhook. A single phrase matching a saved recipe expands it; otherwise the
 * text is parsed, categorized (with the owner's learned rules), and merged.
 * Access/auth is the caller's job; this trusts the `list` it's given.
 */
export async function ingestText(opts: {
  list: { id: string; ownerId: string };
  text: string;
  addedByUserId: string | null;
  addedByName?: string | null;
  /** Default section for lines without a "Section:" prefix. */
  section?: string | null;
}): Promise<IngestResult> {
  const chunks = splitSections(opts.text);
  if (chunks.length > 1 || (chunks[0] && chunks[0].section)) {
    const total: IngestResult = { kind: "items", added: 0, merged: 0, names: [] };
    for (const c of chunks) {
      const r = await ingestOne({ ...opts, text: c.text, section: c.section ?? cleanSection(opts.section) });
      total.added += r.added;
      total.merged += r.merged;
      total.names.push(...r.names);
      if (r.kind === "recipe") { total.kind = "recipe"; total.recipe = r.recipe; }
    }
    return total;
  }
  return ingestOne({ ...opts, section: cleanSection(opts.section) });
}

async function ingestOne(opts: {
  list: { id: string; ownerId: string };
  text: string;
  addedByUserId: string | null;
  addedByName?: string | null;
  section: string | null;
}): Promise<IngestResult> {
  const { list, text, addedByUserId, section } = opts;
  const addedByName = opts.addedByName ?? null;

  const phrase = stripCommandPrefix(text.trim());
  if (phrase && !/[,\n;]/.test(phrase)) {
    const hit = matchRecipe(phrase, await getRecipeRefs(list.ownerId));
    if (hit) {
      const ings = await db
        .select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, hit.id));
      const res = await applyItems(
        list.id,
        ings.map((g) => ({
          name: g.name,
          normalizedName: g.normalizedName,
          qty: g.qty,
          unit: g.unit,
          categoryKey: g.categoryKey,
        })),
        addedByUserId,
        addedByName,
        section,
      );
      return { kind: "recipe", recipe: hit.name, ...res, names: ings.map((g) => g.name) };
    }
  }

  const parsed = parseInput(text).slice(0, MAX_ITEMS);
  if (parsed.length === 0) return { kind: "items", added: 0, merged: 0, names: [] };

  const rules = await db
    .select()
    .from(categorizeRules)
    .where(eq(categorizeRules.ownerId, list.ownerId));
  const learned = new Map(rules.map((r) => [r.normalizedName, r.categoryKey]));

  const res = await applyItems(
    list.id,
    parsed.map((p) => ({
      name: p.name,
      normalizedName: p.normalizedName,
      qty: p.qty,
      unit: p.unit,
      categoryKey: categorize(p.name, learned),
    })),
    addedByUserId,
    addedByName,
    section,
  );
  return { kind: "items", ...res, names: parsed.map((p) => p.name) };
}
