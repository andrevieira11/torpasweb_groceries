import { accentFold } from "./normalize";

/**
 * Unit dictionary (bilingual). Mass and volume convert within their group via
 * `factor` to a base unit (g, ml). Counts collapse to "x". Pack-ish units
 * (can, bottle, box…) only ever merge with an identical canonical — a tin and a
 * bottle are not the same thing.
 */

export type UnitGroup = "mass" | "volume" | "count" | "pack";

export type UnitMeta = {
  canonical: string; // display unit
  group: UnitGroup;
  factor: number; // qty * factor = amount in the group's base unit
};

const UNITS: Record<string, UnitMeta> = {};
function def(meta: UnitMeta, ...aliases: string[]) {
  for (const a of aliases) UNITS[a] = meta;
}

// mass — base g
def({ canonical: "g", group: "mass", factor: 1 }, "g", "gr", "grama", "gramas", "gram", "grams");
def(
  { canonical: "kg", group: "mass", factor: 1000 },
  "kg", "kgs", "kilo", "kilos", "quilo", "quilos", "kilogram", "kilograms", "kilogramme",
);
def(
  { canonical: "mg", group: "mass", factor: 0.001 },
  "mg", "miligrama", "miligramas", "milligram", "milligrams",
);

// volume — base ml
def(
  { canonical: "ml", group: "volume", factor: 1 },
  "ml", "mililitro", "mililitros", "milliliter", "milliliters", "millilitre",
);
def({ canonical: "cl", group: "volume", factor: 10 }, "cl", "centilitro", "centilitros");
def({ canonical: "dl", group: "volume", factor: 100 }, "dl", "decilitro", "decilitros");
def(
  { canonical: "l", group: "volume", factor: 1000 },
  "l", "lt", "lts", "litro", "litros", "liter", "liters", "litre", "litres",
);

// count — base x
def(
  { canonical: "x", group: "count", factor: 1 },
  "x", "×", "un", "und", "uni", "unid", "unidade", "unidades", "unit", "units", "u", "pc", "pcs", "piece", "pieces",
);
def({ canonical: "x", group: "count", factor: 12 }, "dozen", "dozens", "duzia", "duzias");

// pack-ish — base is the canonical itself (no cross-type conversion)
def({ canonical: "pack", group: "pack", factor: 1 }, "pack", "packs", "pacote", "pacotes", "pkt", "pkg");
def({ canonical: "can", group: "pack", factor: 1 }, "can", "cans", "lata", "latas", "tin", "tins");
def({ canonical: "bottle", group: "pack", factor: 1 }, "bottle", "bottles", "garrafa", "garrafas");
def({ canonical: "box", group: "pack", factor: 1 }, "box", "caixa", "caixas");
def({ canonical: "bag", group: "pack", factor: 1 }, "bag", "bags", "saco", "sacos");
def({ canonical: "jar", group: "pack", factor: 1 }, "jar", "jars", "frasco", "frascos");
def({ canonical: "bunch", group: "pack", factor: 1 }, "bunch", "bunches", "molho", "ramo");

/** Resolve a raw unit token to its metadata, or null if unknown. */
export function getUnitMeta(unitStr: string): UnitMeta | null {
  const k = accentFold(unitStr.toLowerCase()).replace(/\.+$/, "").trim();
  return UNITS[k] ?? UNITS[unitStr] ?? null;
}

/** True when a token is a recognized unit word (used by the parser). */
export function isUnit(token: string): boolean {
  return getUnitMeta(token) !== null;
}
