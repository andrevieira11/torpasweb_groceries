import { getUnitMeta, type UnitGroup } from "./parse/units";

/** A quantity is an amount + optional unit; either may be absent. */
export type Quantity = { qty: number | null; unit: string | null };

const round = (n: number) => Math.round(n * 1000) / 1000;

function formatFromBase(base: number, group: UnitGroup): Quantity {
  if (group === "mass") {
    return base >= 1000
      ? { qty: round(base / 1000), unit: "kg" }
      : { qty: round(base), unit: "g" };
  }
  if (group === "volume") {
    return base >= 1000
      ? { qty: round(base / 1000), unit: "l" }
      : { qty: round(base), unit: "ml" };
  }
  return { qty: round(base), unit: "x" }; // count
}

/**
 * Sum two quantities for the SAME normalized item. Returns the merged quantity,
 * or null when the units are incompatible (caller keeps a separate line).
 * Never silently drops a quantity.
 */
export function mergeQuantities(a: Quantity, b: Quantity): Quantity | null {
  if (a.qty == null && b.qty == null) return { qty: null, unit: null };
  if (a.qty == null) return { qty: b.qty, unit: b.unit };
  if (b.qty == null) return { qty: a.qty, unit: a.unit };

  // both plain counts (no unit)
  if (!a.unit && !b.unit) return { qty: round(a.qty + b.qty), unit: null };

  const ma = a.unit ? getUnitMeta(a.unit) : null;
  const mb = b.unit ? getUnitMeta(b.unit) : null;

  // same convertible group: mass / volume / count
  if (ma && mb && ma.group === mb.group && ma.group !== "pack") {
    return formatFromBase(a.qty * ma.factor + b.qty * mb.factor, ma.group);
  }

  // a plain count next to an explicit count unit ("2" + "×3", "2" + "1 dozen")
  if ((!a.unit && mb?.group === "count") || (!b.unit && ma?.group === "count")) {
    const av = a.unit ? a.qty * ma!.factor : a.qty;
    const bv = b.unit ? b.qty * mb!.factor : b.qty;
    return { qty: round(av + bv), unit: "x" };
  }

  // identical canonical (matching pack type, or the same unknown unit string)
  const ca = ma?.canonical ?? a.unit;
  const cb = mb?.canonical ?? b.unit;
  if (ca && cb && ca === cb) return { qty: round(a.qty + b.qty), unit: ca };

  return null; // incompatible -> separate lines
}

/** Are two quantities mergeable into one line? */
export function canMerge(a: Quantity, b: Quantity): boolean {
  return mergeQuantities(a, b) !== null;
}

/** Human display: "2 kg", "×3", "1.5 l", "2 can". Empty when there is no qty. */
export function formatQuantity(qty: number | null, unit: string | null): string {
  if (qty == null) return "";
  const n = String(round(qty));
  if (!unit || unit === "x" || unit === "×") return `×${n}`;
  const meta = getUnitMeta(unit);
  if (meta && (meta.group === "mass" || meta.group === "volume")) {
    return `${n} ${meta.canonical}`;
  }
  return `${n} ${unit}`;
}
