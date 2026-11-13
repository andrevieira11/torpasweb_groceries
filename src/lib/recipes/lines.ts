import { displayQuantity } from "@/lib/quantity";

/**
 * One editable text line per ingredient ("200 g bacon", "×3 ovos", "natas") — the format the
 * New dish sheet pre-fills from a recipe. parseInput reads it back to the same qty + unit; a
 * plain ×1 is left out ("pato", not "×1 pato") and reads back as "no quantity".
 */
export function ingredientLine(g: { name: string; qty: number | null; unit: string | null }): string {
  return [displayQuantity(g.qty, g.unit), g.name].filter(Boolean).join(" ");
}
