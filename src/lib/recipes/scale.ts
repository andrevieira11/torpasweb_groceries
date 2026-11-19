import { getUnitMeta } from "@/lib/parse/units";
import type { Quantity } from "@/lib/quantity";

/**
 * Scale a recipe ingredient from the recipe's servings to the people you cook for (Andre, 2026-11-19:
 * recipes are written for 2; "how many people?" when adding one to the list). Shopping amounts, so we
 * always round UP: whole numbers for counts and packs (you can't buy 1.3 onions or 0.7 tins), grams and
 * millilitres to the next 10 (then kg / l from 1000), unknown units to the next half. No amount stays none.
 */
export function scaleQuantity(q: Quantity, from: number, to: number): Quantity {
  if (q.qty == null || !(from > 0) || !(to > 0) || from === to) return q;
  const f = to / from;
  const up = (n: number, step: number) => Math.ceil(n / step - 1e-9) * step;

  if (!q.unit) return { qty: Math.max(1, up(q.qty * f, 1)), unit: null };
  const m = getUnitMeta(q.unit);
  if (!m) return { qty: Math.max(0.5, up(q.qty * f, 0.5)), unit: q.unit };
  if (m.group === "mass" || m.group === "volume") {
    const base = q.qty * m.factor * f;
    const rounded = base >= 10 ? up(base, 10) : up(base, 1);
    const [big, small] = m.group === "mass" ? ["kg", "g"] : ["l", "ml"];
    return rounded >= 1000 ? { qty: Math.round(rounded) / 1000, unit: big } : { qty: rounded, unit: small };
  }
  if (m.group === "count") return { qty: Math.max(1, up(q.qty * m.factor * f, 1)), unit: "x" };
  return { qty: Math.max(1, up(q.qty * f, 1)), unit: m.canonical }; // packs: whole tins, bags, bottles
}

/** People to cook for: a whole number from 1 to 50 (the stepper's range). */
export const clampPeople = (n: number) => Math.min(50, Math.max(1, Math.round(n) || 1));
